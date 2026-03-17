from __future__ import annotations

import argparse
import math
import re

ALLOWED_EXPRESSION = re.compile(r"[0-9+\-*/().\s]+")


class CalculatorError(ValueError):
    pass


def format_number(value: float) -> str:
    if not math.isfinite(value):
        raise CalculatorError("Calculation overflow")

    normalized = 0.0 if value == 0 else value
    return format(normalized, ".12g")


def close_open_parentheses(expression: str) -> str:
    # Tell åpne parenteser. Resten lukkes automatisk til slutt.
    depth = 0

    for character in expression:
        if character == "(":
            depth += 1
        elif character == ")":
            depth -= 1
            if depth < 0:
                raise CalculatorError("Too many closing parentheses")

    return expression + ")" * depth


def evaluate_expression(expression: str) -> float:
    # Fjern mellomrom for å gjøre sjekk og utregning enklere.
    compact = expression.replace(" ", "")
    if not compact:
        raise CalculatorError("Type an expression first")

    # Tillat bare kalkulatortegn: sifre, operatorer, punktum og parenteser.
    if not ALLOWED_EXPRESSION.fullmatch(compact):
        raise CalculatorError("Only numbers and + - * / ( ) are allowed")

    completed = close_open_parentheses(compact)

    try:
        result = eval(completed, {"__builtins__": {}}, {})
    except Exception as error:
        raise CalculatorError("Incomplete expression") from error

    if not isinstance(result, (int, float)):
        raise CalculatorError("Invalid result")

    value = float(result)
    if not math.isfinite(value):
        raise CalculatorError("Calculation overflow")

    return value


def apply_action(expression: str, action: str) -> float:
    value = evaluate_expression(expression)

    if action == "evaluate":
        return value

    elif action == "square":
        return value * value

    elif action == "sqrt":
        if value < 0:
            raise CalculatorError("Square root needs a non-negative value")
        return math.sqrt(value)

    elif action == "reciprocal":
        if value == 0:
            raise CalculatorError("Cannot divide by zero")
        return 1 / value

    elif action == "sin":
        return math.sin(value)

    elif action == "cos":
        return math.cos(value)

    elif action == "tan":
        return math.tan(value)

    elif action == "log":
        if value <= 0:
            raise CalculatorError("log needs a value greater than zero")
        return math.log10(value)

    raise CalculatorError("Unsupported action")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Simple Python reference calculator for this project."
    )
    parser.add_argument(
        "expression",
        nargs="?",
        help="Expression to evaluate, for example 2*(3+4)",
    )
    parser.add_argument(
        "--action",
        choices=["evaluate", "square", "sqrt", "reciprocal", "sin", "cos", "tan", "log"],
        default="evaluate",
        help="Optional operation to apply to the evaluated expression.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if not args.expression:
        parser.print_help()
        return 1

    try:
        result = apply_action(args.expression, args.action)
    except CalculatorError as error:
        print(f"Error: {error}")
        return 1

    print(format_number(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())