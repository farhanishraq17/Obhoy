// Command scenarios runs the adversarial harness and prints the transcript.
//
//	go run ./cmd/scenarios            every scenario
//	go run ./cmd/scenarios -id S2     one scenario
//	go run ./cmd/scenarios -json      machine-readable, for CI
//
// Most of these produce a refusal rather than a success. A scenario passes when
// the ledger did what it was supposed to do, which for eight of the thirteen
// means declining to write anything at all.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/obhoy/obhoycc/internal/scenarios"
)

func main() {
	id := flag.String("id", "", "run a single scenario (S1..S12, G1)")
	asJSON := flag.Bool("json", false, "emit JSON instead of a transcript")
	quiet := flag.Bool("quiet", false, "print only the summary table")
	flag.Parse()

	var results []scenarios.Result
	if *id != "" {
		res, err := scenarios.RunOne(*id)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(2)
		}
		results = []scenarios.Result{res}
	} else {
		results = scenarios.RunAll()
	}

	if *asJSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(results)
		os.Exit(exitCode(results))
	}

	if !*quiet {
		for _, res := range results {
			printScenario(res)
		}
	}
	printSummary(results)
	os.Exit(exitCode(results))
}

func printScenario(res scenarios.Result) {
	fmt.Printf("\n%s\n", strings.Repeat("=", 78))
	fmt.Printf("%-4s %s\n", res.ID, res.Title)
	fmt.Printf("     criterion: %s\n", res.Criterion)
	fmt.Printf("     %s\n", wrap(res.Claim, 72, "     "))
	fmt.Printf("%s\n", strings.Repeat("-", 78))
	for _, s := range res.Steps {
		mark := "  ok "
		if !s.OK {
			mark = "FAIL "
		}
		verdict := string(s.Got)
		if s.Expect == scenarios.Refused && s.Got == scenarios.Refused {
			verdict = "refused (as required)"
		}
		fmt.Printf("%s%2d. %-14s %-42s %s\n", mark, s.N, s.Actor, s.Action, verdict)
		if s.Got == scenarios.Refused && s.Detail != "" && s.Detail != "committed" {
			fmt.Printf("         %s\n", wrap(s.Detail, 66, "         "))
		}
		if s.Comment != "" {
			fmt.Printf("         -- %s\n", wrap(s.Comment, 63, "            "))
		}
	}
	fmt.Printf("%s\n", strings.Repeat("-", 78))
	status := "PASSED"
	if !res.Passed {
		status = "FAILED"
	}
	fmt.Printf("     %s. %s\n", status, res.Summary)
}

func printSummary(results []scenarios.Result) {
	fmt.Printf("\n%s\n", strings.Repeat("=", 78))
	fmt.Println("SUMMARY")
	fmt.Printf("%s\n", strings.Repeat("-", 78))
	passed := 0
	for _, r := range results {
		mark := "PASS"
		if r.Passed {
			passed++
		} else {
			mark = "FAIL"
		}
		fmt.Printf("  %s  %-4s %-46s %s\n", mark, r.ID, truncate(r.Title, 46), r.Criterion)
	}
	fmt.Printf("%s\n", strings.Repeat("-", 78))
	fmt.Printf("  %d of %d scenarios passed\n\n", passed, len(results))
}

func exitCode(results []scenarios.Result) int {
	for _, r := range results {
		if !r.Passed {
			return 1
		}
	}
	return 0
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}

func wrap(s string, width int, indent string) string {
	words := strings.Fields(s)
	if len(words) == 0 {
		return ""
	}
	var b strings.Builder
	line := ""
	for _, w := range words {
		if line == "" {
			line = w
			continue
		}
		if len(line)+1+len(w) > width {
			b.WriteString(line + "\n" + indent)
			line = w
			continue
		}
		line += " " + w
	}
	b.WriteString(line)
	return b.String()
}
