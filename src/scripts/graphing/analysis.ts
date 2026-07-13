import { parse } from 'mathjs';

import { parentDetails } from '@/scripts/explorer/details';
import { classifyEndBehavior, findVerticalAsymptotes } from '@/scripts/explorer/limits';
import { PARENTS } from '@/scripts/explorer/parents';
import { formatNumber } from './hover';
import {
  formatIntervalNotation,
} from './interval-notation';
import { bisect, evalAt, type Window2D } from './math';

export type AnalysisValue =
  | { kind: 'exact'; value: string }
  | { kind: 'approximate'; value: string }
  | { kind: 'not-applicable' }
  | { kind: 'not-determined' };

export interface FunctionAnalysis {
  domain: AnalysisValue;
  range: AnalysisValue;
  xIntercepts: AnalysisValue;
  yIntercept: AnalysisValue;
  verticalAsymptotes: AnalysisValue;
  horizontalAsymptotes: AnalysisValue;
}

export interface FunctionAnalysisFact {
  label: string;
  value: string;
}

interface MathNodeLike {
  type: string;
  value?: number | string;
  name?: string;
  op?: string;
  args?: MathNodeLike[];
  content?: MathNodeLike;
}

const EPS = 1e-9;
const POLYNOMIAL_EPS = Number.EPSILON * 16;
const ROOT_VALUE_TOLERANCE = 1e-6;
const SAMPLE_COUNT = 2000;
const EXACT = (value: string): AnalysisValue => ({ kind: 'exact', value });
const APPROXIMATE = (value: string): AnalysisValue => ({ kind: 'approximate', value });
const NOT_APPLICABLE: AnalysisValue = { kind: 'not-applicable' };
const NOT_DETERMINED: AnalysisValue = { kind: 'not-determined' };

function canonicalExpression(expression: string): string | null {
  try {
    return parse(expression).toString({ implicit: 'hide' });
  } catch {
    return null;
  }
}

const CANONICAL_PARENTS = new Map(
  PARENTS.map((parent) => [canonicalExpression(parent.expr), parent]),
);

function exactParentAnalysis(expression: string): FunctionAnalysis | null {
  const parent = CANONICAL_PARENTS.get(canonicalExpression(expression));
  if (!parent) return null;
  const details = parentDetails(parent);
  const convert = (value: string): AnalysisValue => {
    if (value === '—' || value === 'none') return NOT_APPLICABLE;
    return EXACT(value);
  };
  return {
    domain: EXACT(formatIntervalNotation(parent.props.domain)),
    range: EXACT(formatIntervalNotation(parent.props.range)),
    xIntercepts: convert(details.xIntercepts),
    yIntercept: convert(details.yIntercept),
    verticalAsymptotes: convert(details.verticalAsymptote),
    horizontalAsymptotes: convert(details.horizontalAsymptote),
  };
}

function trimPolynomial(coefficients: number[]): number[] {
  const result = [...coefficients];
  while (result.length > 1 && Math.abs(result[result.length - 1]) <= POLYNOMIAL_EPS) {
    result.pop();
  }
  return result.map((value) => (Math.abs(value) <= POLYNOMIAL_EPS ? 0 : value));
}

function addPolynomials(left: number[], right: number[], sign = 1): number[] {
  const result = Array.from(
    { length: Math.max(left.length, right.length) },
    (_, index) => (left[index] ?? 0) + sign * (right[index] ?? 0),
  );
  return trimPolynomial(result);
}

function multiplyPolynomials(left: number[], right: number[]): number[] | null {
  if (left.length + right.length - 2 > 2) return null;
  const result = Array.from({ length: left.length + right.length - 1 }, () => 0);
  for (let i = 0; i < left.length; i++) {
    for (let j = 0; j < right.length; j++) result[i + j] += left[i] * right[j];
  }
  return trimPolynomial(result);
}

function polynomialCoefficients(node: MathNodeLike): number[] | null {
  if (node.type === 'ParenthesisNode' && node.content) return polynomialCoefficients(node.content);
  if (node.type === 'ConstantNode') {
    const value = Number(node.value);
    return Number.isFinite(value) ? [value] : null;
  }
  if (node.type === 'SymbolNode') return node.name === 'x' ? [0, 1] : null;
  if (node.type !== 'OperatorNode' || !node.args?.length) return null;

  const [firstNode, secondNode] = node.args;
  const first = polynomialCoefficients(firstNode);
  if (!first) return null;
  if (node.args.length === 1 && node.op === '-') return first.map((value) => -value);
  if (!secondNode) return null;
  const second = polynomialCoefficients(secondNode);
  if (!second) return null;

  if (node.op === '+') return addPolynomials(first, second);
  if (node.op === '-') return addPolynomials(first, second, -1);
  if (node.op === '*') return multiplyPolynomials(first, second);
  if (node.op === '/' && second.length === 1 && Math.abs(second[0]) > POLYNOMIAL_EPS) {
    return first.map((value) => value / second[0]);
  }
  if (node.op === '^' && second.length === 1 && Number.isInteger(second[0])) {
    const exponent = second[0];
    if (exponent < 0 || exponent > 2) return null;
    let result = [1];
    for (let index = 0; index < exponent; index++) {
      const multiplied = multiplyPolynomials(result, first);
      if (!multiplied) return null;
      result = multiplied;
    }
    return result;
  }
  return null;
}

function formattedPolynomialValue(value: number, formatted: string): AnalysisValue {
  const displayed = Number(formatNumber(value));
  return Math.abs(displayed - value) <= POLYNOMIAL_EPS
    ? EXACT(formatted)
    : APPROXIMATE(formatted);
}

function formattedPolynomialValues(values: number[], formatted: string): AnalysisValue {
  return values.every(
    (value) => Math.abs(Number(formatNumber(value)) - value) <= POLYNOMIAL_EPS,
  )
    ? EXACT(formatted)
    : APPROXIMATE(formatted);
}

function exactPolynomialAnalysis(expression: string): FunctionAnalysis | null {
  let coefficients: number[];
  try {
    const parsed = parse(expression) as unknown as MathNodeLike;
    const result = polynomialCoefficients(parsed);
    if (!result) return null;
    coefficients = trimPolynomial(result);
  } catch {
    return null;
  }

  const [c = 0, b = 0, a = 0] = coefficients;
  let range: AnalysisValue = EXACT('(-∞, ∞)');
  if (coefficients.length === 1) {
    range = formattedPolynomialValue(c, `{${formatNumber(c)}}`);
  }
  if (coefficients.length === 3) {
    const vertexY = c - (b * b) / (4 * a);
    range = formattedPolynomialValue(
      vertexY,
      a > 0
        ? `[${formatNumber(vertexY)}, ∞)`
        : `(-∞, ${formatNumber(vertexY)}]`,
    );
  }

  let roots: number[] = [];
  let infiniteRoots = false;
  if (coefficients.length === 1) infiniteRoots = Math.abs(c) <= POLYNOMIAL_EPS;
  if (coefficients.length === 2) roots = [-c / b];
  if (coefficients.length === 3) {
    const discriminant = b * b - 4 * a * c;
    if (Math.abs(discriminant) <= POLYNOMIAL_EPS) roots = [-b / (2 * a)];
    if (discriminant > POLYNOMIAL_EPS) {
      const squareRoot = Math.sqrt(discriminant);
      roots = [(-b - squareRoot) / (2 * a), (-b + squareRoot) / (2 * a)];
    }
  }

  roots.sort((left, right) => left - right);
  const xIntercepts = infiniteRoots
    ? EXACT('infinitely many')
    : roots.length
      ? formattedPolynomialValues(
          roots,
          roots.map((root) => `x = ${formatNumber(root)}`).join(', '),
        )
      : NOT_APPLICABLE;

  return {
    domain: EXACT('(-∞, ∞)'),
    range,
    xIntercepts,
    yIntercept: formattedPolynomialValue(c, `y = ${formatNumber(c)}`),
    verticalAsymptotes: NOT_APPLICABLE,
    horizontalAsymptotes: NOT_APPLICABLE,
  };
}

interface ReciprocalLinearPower {
  numerator: number;
  linearConstant: number;
  linearCoefficient: number;
  exponent: number;
}

function reciprocalLinearPower(node: MathNodeLike): ReciprocalLinearPower | null {
  if (node.type !== 'OperatorNode' || node.op !== '/' || node.args?.length !== 2) {
    return null;
  }

  const numerator = polynomialCoefficients(node.args[0]);
  if (!numerator || numerator.length !== 1 || Math.abs(numerator[0]) <= POLYNOMIAL_EPS) {
    return null;
  }

  let base = node.args[1];
  let exponent = 1;
  if (base.type === 'OperatorNode' && base.op === '^' && base.args?.length === 2) {
    const exponentValue = polynomialCoefficients(base.args[1]);
    if (
      !exponentValue ||
      exponentValue.length !== 1 ||
      !Number.isInteger(exponentValue[0]) ||
      exponentValue[0] <= 0
    ) {
      return null;
    }
    exponent = exponentValue[0];
    base = base.args[0];
  }

  const linear = polynomialCoefficients(base);
  if (!linear || linear.length !== 2 || Math.abs(linear[1]) <= POLYNOMIAL_EPS) {
    return null;
  }

  return {
    numerator: numerator[0],
    linearConstant: linear[0],
    linearCoefficient: linear[1],
    exponent,
  };
}

function exactReciprocalPowerAnalysis(expression: string): FunctionAnalysis | null {
  let reciprocal: ReciprocalLinearPower | null;
  try {
    reciprocal = reciprocalLinearPower(parse(expression) as unknown as MathNodeLike);
  } catch {
    return null;
  }
  if (!reciprocal) return null;

  const { numerator, linearConstant, linearCoefficient, exponent } = reciprocal;
  const excludedX = -linearConstant / linearCoefficient;
  const domainText = formatIntervalNotation({ kind: 'exclude', value: excludedX });
  const range = exponent % 2 === 1
    ? EXACT('(-∞, 0) ∪ (0, ∞)')
    : EXACT(numerator > 0 ? '(0, ∞)' : '(-∞, 0)');
  const denominatorAtZero = linearConstant ** exponent;
  const yIntercept = Math.abs(denominatorAtZero) <= POLYNOMIAL_EPS
    ? NOT_APPLICABLE
    : formattedPolynomialValue(
        numerator / denominatorAtZero,
        `y = ${formatNumber(numerator / denominatorAtZero)}`,
      );

  return {
    domain: formattedPolynomialValue(excludedX, domainText),
    range,
    xIntercepts: NOT_APPLICABLE,
    yIntercept,
    verticalAsymptotes: formattedPolynomialValue(
      excludedX,
      `x = ${formatNumber(excludedX)}`,
    ),
    horizontalAsymptotes: EXACT('y = 0'),
  };
}

function sampleExpression(expression: string, window: Window2D): Array<{ x: number; y: number | null }> {
  const width = window.xMax - window.xMin;
  return Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) => {
    const x = window.xMin + (index * width) / SAMPLE_COUNT;
    return { x, y: evalAt(expression, x) };
  });
}

function approximateRoots(
  expression: string,
  samples: Array<{ x: number; y: number | null }>,
  window: Window2D,
  verticalAsymptotes: number[],
): number[] {
  const roots: number[] = [];
  const tolerance = Math.max((window.xMax - window.xMin) / SAMPLE_COUNT, 1e-6);
  const push = (root: number): void => {
    if (!roots.some((existing) => Math.abs(existing - root) <= tolerance * 2)) roots.push(root);
  };

  for (let index = 1; index < samples.length; index++) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (previous.y === null || current.y === null) continue;
    if (Math.abs(previous.y) < EPS) push(previous.x);
    if (previous.y < 0 !== current.y < 0) {
      const crossesAsymptote = verticalAsymptotes.some(
        (x) => x >= previous.x - tolerance && x <= current.x + tolerance,
      );
      if (crossesAsymptote) continue;
      const root = bisect(expression, 0, previous.x, current.x);
      const rootValue = root === null ? null : evalAt(expression, root);
      if (root !== null && rootValue !== null && Math.abs(rootValue) <= ROOT_VALUE_TOLERANCE) {
        push(root);
      }
    }
  }
  const last = samples.at(-1);
  if (last?.y !== null && last?.y !== undefined && Math.abs(last.y) < EPS) push(last.x);
  return roots.sort((left, right) => left - right);
}

function approximateHorizontalAsymptotes(expression: string): AnalysisValue {
  const negative = classifyEndBehavior(expression, 'neg');
  const positive = classifyEndBehavior(expression, 'pos');
  const negativeValue = negative.kind === 'finite' ? negative.value : undefined;
  const positiveValue = positive.kind === 'finite' ? positive.value : undefined;
  if (negativeValue === undefined && positiveValue === undefined) return NOT_DETERMINED;
  if (
    negativeValue !== undefined &&
    positiveValue !== undefined &&
    Math.abs(negativeValue - positiveValue) < 1e-3
  ) {
    return APPROXIMATE(`y = ${formatNumber((negativeValue + positiveValue) / 2)}`);
  }
  const values: string[] = [];
  if (negativeValue !== undefined) values.push(`as x → -∞, y = ${formatNumber(negativeValue)}`);
  if (positiveValue !== undefined) values.push(`as x → ∞, y = ${formatNumber(positiveValue)}`);
  return APPROXIMATE(values.join('; '));
}

function approximateAnalysis(expression: string, window: Window2D): FunctionAnalysis {
  const samples = sampleExpression(expression, window);
  const finite = samples.filter(
    (sample): sample is { x: number; y: number } => sample.y !== null,
  );
  if (!finite.length) {
    return {
      domain: NOT_DETERMINED,
      range: NOT_DETERMINED,
      xIntercepts: NOT_DETERMINED,
      yIntercept: NOT_DETERMINED,
      verticalAsymptotes: NOT_DETERMINED,
      horizontalAsymptotes: NOT_DETERMINED,
    };
  }

  const vertical = findVerticalAsymptotes(expression, window);
  const roots = approximateRoots(
    expression,
    samples,
    window,
    vertical.map((wall) => wall.x),
  );
  const yAtZero = evalAt(expression, 0);

  return {
    domain: NOT_DETERMINED,
    range: NOT_DETERMINED,
    xIntercepts: roots.length
      ? APPROXIMATE(
          `${roots.map((root) => `x = ${formatNumber(root)}`).join(', ')} in visible window`,
        )
      : NOT_DETERMINED,
    yIntercept:
      yAtZero === null
        ? NOT_APPLICABLE
        : APPROXIMATE(`y = ${formatNumber(yAtZero)} in visible window`),
    verticalAsymptotes: vertical.length
      ? APPROXIMATE(
          `${vertical.map((wall) => `x = ${formatNumber(wall.x)}`).join(', ')} in visible window`,
        )
      : NOT_DETERMINED,
    horizontalAsymptotes: approximateHorizontalAsymptotes(expression),
  };
}

export function analyzeFunction(expression: string, window: Window2D): FunctionAnalysis {
  return (
    exactParentAnalysis(expression) ??
    exactPolynomialAnalysis(expression) ??
    exactReciprocalPowerAnalysis(expression) ??
    approximateAnalysis(expression, window)
  );
}

export function functionAnalysisFacts(analysis: FunctionAnalysis): FunctionAnalysisFact[] {
  const entries: Array<[string, AnalysisValue]> = [
    ['Domain', analysis.domain],
    ['Range', analysis.range],
    ['x-intercepts', analysis.xIntercepts],
    ['y-intercept', analysis.yIntercept],
    ['Vertical asymptotes', analysis.verticalAsymptotes],
    ['Horizontal asymptotes', analysis.horizontalAsymptotes],
  ];
  return entries.flatMap(([label, result]) => {
    if (result.kind === 'not-applicable') return [];
    if (result.kind === 'not-determined') return [{ label, value: 'Not determined' }];
    return [{
      label,
      value: result.kind === 'approximate' ? `Approx. ${result.value}` : result.value,
    }];
  });
}
