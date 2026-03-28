'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  ArrowDown,
  Play,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowLeft,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Premise {
  id: string;
  text: string;
}

interface AnalysisResult {
  isValid: boolean;
  fallacies: Fallacy[];
  hiddenPremises: string[];
  strengtheningTips: string[];
  explanation: string;
}

interface Fallacy {
  name: string;
  description: string;
  explanation: string;
}

interface ExampleArgument {
  id: string;
  name: string;
  tag: string;
  tagColor: string;
  premises: string[];
  conclusion: string;
  description: string;
}

// ── Example Arguments ──────────────────────────────────────────────────────

const EXAMPLES: ExampleArgument[] = [
  {
    id: 'valid-syllogism',
    name: 'Classic Syllogism',
    tag: 'Valid',
    tagColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    premises: [
      'All mammals are warm-blooded.',
      'All dogs are mammals.',
    ],
    conclusion: 'Therefore, all dogs are warm-blooded.',
    description: 'A textbook valid deductive argument. The conclusion necessarily follows from the premises.',
  },
  {
    id: 'hidden-premise',
    name: 'Hidden Premise',
    tag: 'Unstated Assumption',
    tagColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    premises: [
      'She graduated from Harvard.',
    ],
    conclusion: 'Therefore, she will be an excellent employee.',
    description: 'This argument hides a crucial premise: that Harvard graduates make excellent employees. Without stating it, the reasoning has a gap.',
  },
  {
    id: 'circular',
    name: 'Circular Reasoning',
    tag: 'Circular',
    tagColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    premises: [
      'This news source is reliable because it always tells the truth.',
      'We know it always tells the truth because it is a reliable source.',
    ],
    conclusion: 'Therefore, everything this news source reports is true.',
    description: 'The premises assume what they are trying to prove — the argument goes in a circle.',
  },
  {
    id: 'non-sequitur',
    name: 'Non Sequitur',
    tag: 'Non Sequitur',
    tagColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    premises: [
      'Maria is an excellent painter.',
      'Maria has won several art competitions.',
    ],
    conclusion: 'Therefore, Maria would make an outstanding surgeon.',
    description: 'The conclusion does not follow from the premises. Artistic talent does not logically imply surgical skill.',
  },
  {
    id: 'false-dilemma',
    name: 'False Dilemma',
    tag: 'False Dilemma',
    tagColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    premises: [
      'Either we eliminate all cars from the city or air pollution will destroy our health.',
      'We cannot let air pollution destroy our health.',
    ],
    conclusion: 'Therefore, we must eliminate all cars from the city.',
    description: 'Presents only two extreme options when many alternatives exist (electric vehicles, public transit, emission standards, etc.).',
  },
];

// ── Analysis Engine ────────────────────────────────────────────────────────

function analyzeArgument(premises: Premise[], conclusion: string): AnalysisResult {
  const premiseTexts = premises.map(p => p.text.toLowerCase().trim());
  const conclusionLower = conclusion.toLowerCase().trim();

  const fallacies: Fallacy[] = [];
  const hiddenPremises: string[] = [];
  const strengtheningTips: string[] = [];

  if (premiseTexts.length === 0 || !conclusionLower) {
    return {
      isValid: false,
      fallacies: [],
      hiddenPremises: [],
      strengtheningTips: ['Add at least one premise and a conclusion to analyze.'],
      explanation: 'An argument needs at least one premise and a conclusion.',
    };
  }

  // Check for circular reasoning: premises and conclusion restate each other
  const circularScore = detectCircularReasoning(premiseTexts, conclusionLower);
  if (circularScore > 0.6) {
    fallacies.push({
      name: 'Circular Reasoning (Begging the Question)',
      description: 'The conclusion is assumed in one or more of the premises.',
      explanation: 'The premises essentially restate the conclusion in different words, so the argument proves nothing new.',
    });
  }

  // Check for non-sequitur: conclusion has little connection to premises
  const relevanceScore = detectRelevance(premiseTexts, conclusionLower);
  if (relevanceScore < 0.15 && premiseTexts.length > 0) {
    fallacies.push({
      name: 'Non Sequitur',
      description: 'The conclusion does not follow from the premises.',
      explanation: 'The premises discuss topics that are not logically connected to the conclusion. The conclusion introduces concepts not established in the premises.',
    });
  }

  // Check for false dilemma
  const falseDilemma = detectFalseDilemma(premiseTexts);
  if (falseDilemma) {
    fallacies.push({
      name: 'False Dilemma (False Dichotomy)',
      description: 'The argument presents only two options when more exist.',
      explanation: 'One of the premises frames the situation as having only two choices. Consider whether intermediate options or alternatives have been excluded.',
    });
  }

  // Check for ad hominem
  const adHominem = detectAdHominem(premiseTexts);
  if (adHominem) {
    fallacies.push({
      name: 'Ad Hominem',
      description: 'The argument attacks the person rather than addressing their claim.',
      explanation: 'Instead of engaging with the substance of an argument, it targets the character or circumstances of the person making it.',
    });
  }

  // Check for appeal to authority without proper support
  const appealToAuthority = detectAppealToAuthority(premiseTexts);
  if (appealToAuthority) {
    fallacies.push({
      name: 'Appeal to Authority',
      description: 'The argument relies on an authority figure rather than evidence.',
      explanation: 'While expert opinions can support arguments, simply citing someone as an authority without relevant evidence is not sufficient.',
    });
  }

  // Check for hidden premises / unstated assumptions
  const gaps = detectHiddenPremises(premiseTexts, conclusionLower);
  hiddenPremises.push(...gaps);

  // Determine validity
  const hasNoFallacies = fallacies.length === 0;
  const hasGoodRelevance = relevanceScore >= 0.15;
  const hasNoCriticalGaps = hiddenPremises.length === 0;
  const isValid = hasNoFallacies && hasGoodRelevance && (hasNoCriticalGaps || premiseTexts.length >= 2);

  // Generate strengthening tips
  if (premiseTexts.length === 1) {
    strengtheningTips.push('Add more premises to strengthen the logical chain from evidence to conclusion.');
  }

  if (hiddenPremises.length > 0) {
    strengtheningTips.push('Make hidden assumptions explicit by adding them as premises.');
  }

  if (!hasGoodRelevance && fallacies.length === 0) {
    strengtheningTips.push('Strengthen the connection between your premises and conclusion by adding intermediate reasoning steps.');
  }

  if (fallacies.length > 0) {
    strengtheningTips.push('Restructure the argument to avoid the identified fallacies.');
  }

  if (isValid && premiseTexts.length >= 2) {
    strengtheningTips.push('Consider whether any premise could be challenged — adding supporting evidence makes the argument more robust.');
    strengtheningTips.push('Test the argument by trying to construct a counter-example where the premises are true but the conclusion is false.');
  }

  const explanation = isValid
    ? 'This argument appears logically structured. The conclusion follows from the premises without obvious fallacies.'
    : `This argument has structural issues. ${fallacies.length > 0 ? `${fallacies.length} fallac${fallacies.length === 1 ? 'y' : 'ies'} detected. ` : ''}${hiddenPremises.length > 0 ? `${hiddenPremises.length} unstated assumption${hiddenPremises.length === 1 ? '' : 's'} found.` : ''}`;

  return { isValid, fallacies, hiddenPremises, strengtheningTips, explanation };
}

function getWords(text: string): Set<string> {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither',
    'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very',
    'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    'we', 'us', 'our', 'he', 'him', 'his', 'she', 'her', 'i', 'me', 'my',
    'therefore', 'thus', 'hence', 'because', 'since', 'if', 'then', 'also',
  ]);

  return new Set(
    text.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
  );
}

function detectCircularReasoning(premises: string[], conclusion: string): number {
  const conclusionWords = getWords(conclusion);
  if (conclusionWords.size === 0) return 0;

  let maxOverlap = 0;
  for (const premise of premises) {
    const premiseWords = getWords(premise);
    if (premiseWords.size === 0) continue;

    const overlap = [...conclusionWords].filter(w => premiseWords.has(w)).length;
    const overlapRatio = overlap / Math.max(conclusionWords.size, premiseWords.size);

    // Also check if premise restates conclusion
    const bigramOverlap = checkPhraseOverlap(premise, conclusion);

    maxOverlap = Math.max(maxOverlap, (overlapRatio + bigramOverlap) / 2);
  }

  // Also check if premises reference each other circularly
  if (premises.length >= 2) {
    for (let i = 0; i < premises.length; i++) {
      for (let j = i + 1; j < premises.length; j++) {
        const wordsA = getWords(premises[i]);
        const wordsB = getWords(premises[j]);
        if (wordsA.size === 0 || wordsB.size === 0) continue;

        const overlap = [...wordsA].filter(w => wordsB.has(w)).length;
        const ratio = overlap / Math.min(wordsA.size, wordsB.size);
        if (ratio > 0.7) {
          maxOverlap = Math.max(maxOverlap, ratio * 0.8);
        }
      }
    }
  }

  return maxOverlap;
}

function checkPhraseOverlap(a: string, b: string): number {
  const wordsA = a.replace(/[^\w\s]/g, '').split(/\s+/);
  const wordsB = b.replace(/[^\w\s]/g, '').split(/\s+/);

  let matchedBigrams = 0;
  let totalBigrams = 0;

  for (let i = 0; i < wordsA.length - 1; i++) {
    const bigram = wordsA[i] + ' ' + wordsA[i + 1];
    totalBigrams++;
    for (let j = 0; j < wordsB.length - 1; j++) {
      if (wordsB[j] + ' ' + wordsB[j + 1] === bigram) {
        matchedBigrams++;
        break;
      }
    }
  }

  return totalBigrams > 0 ? matchedBigrams / totalBigrams : 0;
}

function detectRelevance(premises: string[], conclusion: string): number {
  const conclusionWords = getWords(conclusion);
  if (conclusionWords.size === 0) return 0;

  const allPremiseWords = new Set<string>();
  for (const p of premises) {
    for (const w of getWords(p)) {
      allPremiseWords.add(w);
    }
  }

  if (allPremiseWords.size === 0) return 0;

  const overlap = [...conclusionWords].filter(w => allPremiseWords.has(w)).length;
  return overlap / conclusionWords.size;
}

function detectFalseDilemma(premises: string[]): boolean {
  const dilemmaPatterns = [
    /either\s+.+\s+or\s+/i,
    /only\s+two\s+(options|choices|ways)/i,
    /must\s+(choose|pick|decide)\s+between/i,
    /there\s+(are|is)\s+no\s+other\s+(option|choice|way|alternative)/i,
    /if\s+not\s+.+then\s+/i,
  ];

  return premises.some(p =>
    dilemmaPatterns.some(pattern => pattern.test(p))
  );
}

function detectAdHominem(premises: string[]): boolean {
  const patterns = [
    /can'?t\s+be\s+trusted/i,
    /is\s+(a\s+)?(liar|fool|idiot|stupid|incompetent|corrupt)/i,
    /has\s+no\s+(right|authority|credibility)/i,
    /what\s+would\s+.+\s+know\s+about/i,
    /consider\s+the\s+source/i,
  ];

  return premises.some(p => patterns.some(pattern => pattern.test(p)));
}

function detectAppealToAuthority(premises: string[]): boolean {
  const patterns = [
    /\b(expert|authority|scientist|doctor|professor)\s+says?\b/i,
    /according\s+to\s+(the\s+)?(experts?|authorities)/i,
    /\b(famous|renowned|well-known)\s+(person|figure|expert)\b/i,
    /everyone\s+knows/i,
    /\bmillions?\s+of\s+people\s+(believe|think|agree)/i,
  ];

  return premises.some(p => patterns.some(pattern => pattern.test(p)));
}

function detectHiddenPremises(premises: string[], conclusion: string): string[] {
  const hidden: string[] = [];
  const conclusionWords = getWords(conclusion);
  const allPremiseWords = new Set<string>();

  for (const p of premises) {
    for (const w of getWords(p)) {
      allPremiseWords.add(w);
    }
  }

  // Find key concepts in conclusion not in premises
  const newConcepts = [...conclusionWords].filter(w => !allPremiseWords.has(w));

  if (newConcepts.length > 0 && premises.length > 0) {
    const premiseConcepts = [...allPremiseWords].slice(0, 3).join(', ');
    const conclusionConcepts = newConcepts.slice(0, 3).join(', ');

    if (newConcepts.length >= 2) {
      hidden.push(
        `The conclusion introduces concepts (${conclusionConcepts}) not established in the premises (which discuss ${premiseConcepts}). An unstated assumption links these topics.`
      );
    }
  }

  // Single premise drawing big conclusion
  if (premises.length === 1 && conclusionWords.size > 3) {
    hidden.push(
      'A single premise supports a broad conclusion. There is likely an unstated general principle connecting the specific premise to the conclusion.'
    );
  }

  return hidden;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ArgumentBuilderPage() {
  const [premises, setPremises] = useState<Premise[]>([
    { id: crypto.randomUUID(), text: '' },
  ]);
  const [conclusion, setConclusion] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [activeExample, setActiveExample] = useState<string | null>(null);

  const addPremise = useCallback(() => {
    setPremises(prev => [...prev, { id: crypto.randomUUID(), text: '' }]);
  }, []);

  const removePremise = useCallback((id: string) => {
    setPremises(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev);
  }, []);

  const updatePremise = useCallback((id: string, text: string) => {
    setPremises(prev => prev.map(p => p.id === id ? { ...p, text } : p));
  }, []);

  const analyze = useCallback(() => {
    const filledPremises = premises.filter(p => p.text.trim());
    const result = analyzeArgument(filledPremises, conclusion);
    setAnalysis(result);
  }, [premises, conclusion]);

  const reset = useCallback(() => {
    setPremises([{ id: crypto.randomUUID(), text: '' }]);
    setConclusion('');
    setAnalysis(null);
    setActiveExample(null);
  }, []);

  const loadExample = useCallback((example: ExampleArgument) => {
    setPremises(example.premises.map(text => ({ id: crypto.randomUUID(), text })));
    setConclusion(example.conclusion);
    setAnalysis(null);
    setActiveExample(example.id);
  }, []);

  const filledPremises = premises.filter(p => p.text.trim());
  const canAnalyze = filledPremises.length > 0 && conclusion.trim().length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold font-heading text-primary">
              Argument Builder
            </h1>
            <p className="text-muted-foreground text-sm">
              Construct formal arguments, visualize their structure, and analyze their validity
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Examples Section */}
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setShowExamples(!showExamples)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Example Arguments</CardTitle>
              </div>
              {showExamples ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </div>
            <CardDescription>Load a pre-built argument to explore and modify</CardDescription>
          </CardHeader>
          {showExamples && (
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {EXAMPLES.map(example => (
                  <button
                    key={example.id}
                    onClick={() => loadExample(example)}
                    className={`text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                      activeExample === example.id
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border hover:border-primary/50 bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${example.tagColor}`}>
                        {example.tag}
                      </span>
                    </div>
                    <div className="font-medium text-sm mb-1">{example.name}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {example.description}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* Left Column: Input */}
          <div className="space-y-6">
            {/* Premises */}
            <Card>
              <CardHeader>
                <CardTitle>Premises</CardTitle>
                <CardDescription>
                  Statements assumed to be true that support the conclusion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {premises.map((premise, index) => (
                  <div key={premise.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono w-6 shrink-0 text-right">
                      P{index + 1}
                    </span>
                    <Input
                      value={premise.text}
                      onChange={e => updatePremise(premise.id, e.target.value)}
                      placeholder={`Premise ${index + 1}...`}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (index === premises.length - 1) addPremise();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removePremise(premise.id)}
                      disabled={premises.length <= 1}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addPremise} className="w-full">
                  <Plus className="h-4 w-4" />
                  Add Premise
                </Button>
              </CardContent>
            </Card>

            {/* Conclusion */}
            <Card>
              <CardHeader>
                <CardTitle>Conclusion</CardTitle>
                <CardDescription>
                  The claim that the premises are meant to support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary font-mono w-6 shrink-0 text-right font-bold">
                    C
                  </span>
                  <Input
                    value={conclusion}
                    onChange={e => setConclusion(e.target.value)}
                    placeholder="Therefore..."
                    onKeyDown={e => {
                      if (e.key === 'Enter' && canAnalyze) {
                        e.preventDefault();
                        analyze();
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={analyze} disabled={!canAnalyze} className="flex-1">
                <Play className="h-4 w-4" />
                Analyze Argument
              </Button>
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          {/* Right Column: Visualization + Results */}
          <div className="space-y-6">
            {/* Visual Structure */}
            <Card>
              <CardHeader>
                <CardTitle>Argument Structure</CardTitle>
                <CardDescription>Visual representation of your argument</CardDescription>
              </CardHeader>
              <CardContent>
                {filledPremises.length === 0 && !conclusion.trim() ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Add premises and a conclusion to see the structure
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Premise Boxes */}
                    <div className="flex flex-wrap gap-2">
                      {(filledPremises.length > 0 ? filledPremises : premises.filter(p => p.text.trim())).length > 0 ? (
                        filledPremises.map((premise, index) => (
                          <div
                            key={premise.id}
                            className={`flex-1 min-w-[140px] p-3 rounded-lg border text-sm ${
                              analysis
                                ? analysis.isValid
                                  ? 'border-emerald-500/30 bg-emerald-500/5'
                                  : 'border-amber-500/30 bg-amber-500/5'
                                : 'border-border bg-muted/30'
                            }`}
                          >
                            <div className="text-xs text-muted-foreground font-mono mb-1">
                              P{index + 1}
                            </div>
                            <div className="leading-snug">{premise.text}</div>
                          </div>
                        ))
                      ) : (
                        <div className="w-full p-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground text-center">
                          No premises yet
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-0.5 h-6 ${analysis ? (analysis.isValid ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-border'}`} />
                        <ArrowDown className={`h-5 w-5 ${analysis ? (analysis.isValid ? 'text-emerald-500' : 'text-amber-500') : 'text-muted-foreground'}`} />
                        {analysis && (
                          <span className={`text-xs font-medium ${analysis.isValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {analysis.isValid ? 'supports' : 'does not support'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Conclusion Box */}
                    {conclusion.trim() ? (
                      <div
                        className={`p-4 rounded-lg border-2 text-sm font-medium ${
                          analysis
                            ? analysis.isValid
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-amber-500/50 bg-amber-500/10'
                            : 'border-primary/30 bg-primary/5'
                        }`}
                      >
                        <div className="text-xs text-muted-foreground font-mono mb-1">
                          Conclusion
                        </div>
                        <div className="leading-snug">{conclusion}</div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground text-center">
                        No conclusion yet
                      </div>
                    )}

                    {/* Hidden Premises (if analysis found them) */}
                    {analysis && analysis.hiddenPremises.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-xs font-medium text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Unstated Assumptions
                        </div>
                        {analysis.hiddenPremises.map((hp, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 text-sm text-amber-300/80"
                          >
                            {hp}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysis && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {analysis.isValid ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-amber-500" />
                    )}
                    <CardTitle>
                      {analysis.isValid ? 'Valid Argument' : 'Issues Detected'}
                    </CardTitle>
                    <Badge
                      variant={analysis.isValid ? 'default' : 'secondary'}
                      className={analysis.isValid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}
                    >
                      {analysis.isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                  <CardDescription>{analysis.explanation}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Fallacies */}
                  {analysis.fallacies.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Fallacies Detected
                      </h3>
                      <div className="space-y-3">
                        {analysis.fallacies.map((fallacy, i) => (
                          <div key={i} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                            <div className="font-medium text-sm">{fallacy.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {fallacy.description}
                            </div>
                            <div className="text-sm mt-2 text-foreground/80">
                              {fallacy.explanation}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengthening Tips */}
                  {analysis.strengtheningTips.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        {analysis.isValid ? 'Ways to Strengthen' : 'Suggestions'}
                      </h3>
                      <ul className="space-y-2">
                        {analysis.strengtheningTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5 shrink-0">-</span>
                            <span className="text-foreground/80">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
