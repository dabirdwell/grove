import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { BucketConfig, AllocationTypeValue } from '@/types';

// GET /api/buckets - List all buckets for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'demo-user';
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const buckets = await prisma.bucket.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { priority: 'asc' },
      include: {
        masterAccount: {
          select: { id: true, name: true, nickname: true, mask: true },
        },
        targetAccount: {
          select: { id: true, name: true, nickname: true, mask: true },
        },
      },
    });

    const bucketConfigs: BucketConfig[] = buckets.map(b => ({
      id: b.id,
      bucketId: b.id,
      name: b.name,
      emoji: b.emoji || undefined,
      description: b.description || undefined,
      allocationType: b.allocationType as AllocationTypeValue,
      value: b.allocationValue,
      priority: b.priority,
      targetExternalAccountId: b.targetAccountId || undefined,
      color: b.color || undefined,
    }));

    return NextResponse.json({ buckets: bucketConfigs });
  } catch (error) {
    console.error('[API GET /buckets] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buckets' },
      { status: 500 }
    );
  }
}

// POST /api/buckets - Create a new bucket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId = 'demo-user',
      masterAccountId,
      name,
      emoji,
      description,
      allocationType,
      value,
      targetAccountId,
      color,
    } = body;

    // Validate required fields
    if (!name || !allocationType || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, allocationType, value' },
        { status: 400 }
      );
    }

    // Validate allocation type
    const validTypes: AllocationTypeValue[] = [
      'fixed_dollar',
      'percent_of_income',
      'percent_of_remainder',
      'percent_of_discretionary',
    ];
    if (!validTypes.includes(allocationType)) {
      return NextResponse.json(
        { error: `Invalid allocationType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate percentage values
    if (allocationType.startsWith('percent') && (value < 0 || value > 1)) {
      return NextResponse.json(
        { error: 'Percentage value must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Validate fixed dollar values
    if (allocationType === 'fixed_dollar' && value < 0) {
      return NextResponse.json(
        { error: 'Fixed dollar value cannot be negative' },
        { status: 400 }
      );
    }

    // Get or find master account
    let effectiveMasterAccountId = masterAccountId;
    if (!effectiveMasterAccountId) {
      const masterAccount = await prisma.account.findFirst({
        where: { userId, isMaster: true },
      });
      if (!masterAccount) {
        return NextResponse.json(
          { error: 'No master account set. Please set a master account first.' },
          { status: 400 }
        );
      }
      effectiveMasterAccountId = masterAccount.id;
    }

    // Check for only one percent_of_remainder bucket
    if (allocationType === 'percent_of_remainder') {
      const existingRemainderBucket = await prisma.bucket.findFirst({
        where: {
          userId,
          allocationType: 'percent_of_remainder',
          isArchived: false,
        },
      });
      if (existingRemainderBucket) {
        return NextResponse.json(
          { error: 'Only one percent_of_remainder bucket is allowed.' },
          { status: 400 }
        );
      }
    }

    // Calculate priority based on allocation type
    const existingBuckets = await prisma.bucket.findMany({
      where: { userId, isArchived: false },
      orderBy: { priority: 'desc' },
    });

    let priority: number;
    if (allocationType === 'fixed_dollar') {
      priority = 1;
    } else if (allocationType === 'percent_of_income') {
      priority = 1;
    } else if (allocationType === 'percent_of_remainder') {
      priority = 2;
    } else {
      // percent_of_discretionary
      const maxPriority = existingBuckets.length > 0 ? existingBuckets[0].priority : 2;
      priority = Math.max(3, maxPriority + 1);
    }

    // Create bucket
    const bucket = await prisma.bucket.create({
      data: {
        userId,
        masterAccountId: effectiveMasterAccountId,
        name,
        emoji,
        description,
        allocationType,
        allocationValue: value,
        priority,
        targetAccountId,
        color,
      },
    });

    console.log(`[API POST /buckets] Created bucket: ${bucket.name} (${bucket.id})`);

    return NextResponse.json({
      message: 'Bucket created successfully',
      bucket: {
        id: bucket.id,
        bucketId: bucket.id,
        name: bucket.name,
        emoji: bucket.emoji,
        description: bucket.description,
        allocationType: bucket.allocationType,
        value: bucket.allocationValue,
        priority: bucket.priority,
        targetExternalAccountId: bucket.targetAccountId,
        color: bucket.color,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[API POST /buckets] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create bucket' },
      { status: 500 }
    );
  }
}
