// Command localnode runs the Obhoy chaincode against an in-process ledger and
// serves it over HTTP.
//
// It exists so the whole system can be driven -- the web application, the
// twelve scenarios, the privacy dump -- on a laptop with nothing installed but
// Go. The contract functions it executes are the same ones a Fabric peer runs;
// what is missing is everything outside chaincode: endorsement, ordering, MSP
// validation, private-data confidentiality. Those are the properties the real
// network provides, and the README does not pretend this substitutes for them.
package main

import (
	"flag"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/obhoy/obhoycc/internal/httpapi"
	"github.com/obhoy/obhoycc/internal/scenarios"
)

func main() {
	addr := flag.String("addr", ":7545", "listen address")
	quiet := flag.Bool("quiet", false, "suppress the per-transaction log")
	webDir := flag.String("web", "", "directory of the web application to serve at /")
	flag.Parse()

	log.SetFlags(0)
	log.Println("obhoy local node")
	log.Println("  running real chaincode against an in-process ledger")
	log.Println("  no endorsement, no ordering, no MSP validation -- see docs/LIMITATIONS.md")
	log.Println()

	srv := httpapi.New()
	start := time.Now()
	srv.Bootstrap()
	if !*quiet {
		log.Println("bootstrap:")
		srv.Log(0)
		log.Println()
	}
	for _, line := range srv.BootstrapSummary() {
		log.Println("  " + line)
	}
	log.Printf("  bootstrap took %s", time.Since(start).Round(time.Millisecond))
	log.Println()
	log.Printf("listening on http://localhost%s", *addr)
	log.Println("  GET /api/health          node status")
	log.Println("  GET /api/ledger/state    the entire world state, for the privacy check")
	log.Println("  GET /api/periods         published transparency totals")
	log.Println("  GET /api/scenarios       the adversarial harness")
	log.Println()

	// The harness is mounted separately because each scenario runs against its
	// own freshly bootstrapped ledger: firing the duplicate-refusal scenario
	// must not leave its wreckage in the ledger the operator is browsing.
	top := http.NewServeMux()
	top.Handle("/api/scenarios", scenarios.Routes())
	top.Handle("/api/scenarios/run", scenarios.Routes())
	top.Handle("/api/", srv.Routes())

	// The web application is served from the same origin as the API, so there
	// is one process, one port and one command to start the whole thing.
	dir := *webDir
	if dir == "" {
		for _, candidate := range []string{"web", "../web", "../../web", "../../../web"} {
			if info, err := os.Stat(filepath.Join(candidate, "index.html")); err == nil && !info.IsDir() {
				dir = candidate
				break
			}
		}
	}
	if dir != "" {
		abs, _ := filepath.Abs(dir)
		log.Printf("serving the web application from %s", abs)
		top.Handle("/", http.FileServer(http.Dir(dir)))
	} else {
		log.Println("no web/ directory found; serving the API only")
		top.Handle("/", srv.Routes())
	}
	log.Println()

	if err := http.ListenAndServe(*addr, top); err != nil {
		log.Fatalf("obhoy local node: %v", err)
	}
}
