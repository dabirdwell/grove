import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { AllocationTypeValue } from '@/types';

// GET /api/buckets/[id] - Get a single bucket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const bucket = await prisma.bucket.findUnique({
      where: { id },
      include: {
        masterAccount: {
          select: { id: true, name: true, nickname: true, mask: true },
        },
        targetAccount: {
          select: { id: true, name: true, nickname: true, mask: true },
        },
        goals: true,
      },
    });

    if (!bucket) {
      return NextResponse.json(
        { error: 'Bucket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
        isArchived: bucket.isArchived,
        masterAccount: bucket.masterAccount,
        targetAccount: bucket.targetAccount,
        goals: bucket.goals,
      },
    });
  } catch (error) {
    console.error('[API GET /buckets/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bucket' },
      { status: 500 }
    );
  }
}

// PUT /api/buckets/[id] - Update a bucket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      emoji,
      description,
      allocationType,
      value,
      priority,
      targetAccountId,
      color,
      isArchived,
    } = body;

    // Verify bucket exists
    const existingBucket = await prisma.bucket.findUnique({
      where: { id },
    });

    if (!existingBucket) {
      return NextResponse.json(
        { error: 'Bucket not found' },
        { status: 404 }
      );
    }

    // Validate allocation type if provided
    if (allocationType) {
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
      const effectiveType = allocationType || existingBucket.allocationType;
      const effectiveValue = value !== undefined ? value : existingBucket.allocationValue;

      if (effectiveType.startsWith('percent') && (effectiveValue < 0 || effectiveValue > 1)) {
        return NextResponse.json(
          { error: 'Percentage value must be between 0 and 1' },
          { status: 400 }
        );
      }

      if (effectiveType === 'fixed_dollar' && effectiveValue < 0) {
        return NextResponse.json(
          { error: 'Fixed dollar value cannot be negative' },
          { status: 400 }
        );
      }

      // Check for only one percent_of_remainder bucket
      if (
        allocationType === 'percent_of_remainder' &&
        existingBucket.allocationType !== 'percent_of_remainder'
      ) {
        const existingRemainderBucket = await prisma.bucket.findFirst({
          where: {
            userId: existingBucket.userId,
            allocationType: 'percent_of_remainder',
            isArchived: false,
            NOT: { id },
          },
        });
        if (existingRemainderBucket) {
          return NextResponse.json(
            { error: 'Only one percent_of_remainder bucket is allowed.' },
            { status: 400 }
          );
        }
      }
    }

    // Update bucket
    const bucket = await prisma.bucket.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(emoji !== undefined && { emoji }),
        ...(description !== undefined && { description }),
        ...(allocationType !== undefined && { allocationType }),
        ...(value !== undefined && { allocationValue: value }),
        ...(priority !== undefined && { priority }),
        ...(targetAccountId !== undefined && { targetAccountId }),
        ...(color !== undefined && { color }),
        ...(isArchived !== undefined && { isArchived }),
      },
    });

    console.log(`[API PUT /buckets/[id]] Updated bucket: ${bucket.name} (${bucket.id})`);

    return NextResponse.json({
      message: 'Bucket updated successfully',
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
        isArchived: bucket.isArchived,
      },
    });
  } catch (error) {
    console.error('[API PUT /buckets/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update bucket' },
      { status: 500 }
    );
  }
}

// DELETE /api/buckets/[id] - Delete a bucket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const archive = searchParams.get('archive') === 'true';

    // Verify bucket exists
    const existingBucket = await prisma.bucket.findUnique({
      where: { id },
    });

    if (!existingBucket) {
      return NextResponse.json(
        { error: 'Bucket not found' },
        { status: 404 }
      );
    }

    if (archive) {
      // Archive instead of delete
      await prisma.bucket.update({
        where: { id },
        data: { isArchived: true },
      });

      console.log(`[API DELETE /buckets/[id]] Archived bucket: ${existingBucket.name} (${id})`);

      return NextResponse.json({
        message: 'Bucket archived successfully',
      });
    } else {
      // Permanently delete
      await prisma.bucket.delete({
        where: { id },
      });

      console.log(`[API DELETE /buckets/[id]] Deleted bucket: ${existingBucket.name} (${id})`);

      return NextResponse.json({
        message: 'Bucket deleted successfully',
      });
    }
  } catch (error) {
    console.error('[API DELETE /buckets/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete bucket' },
      { status: 500 }
    );
  }
}
