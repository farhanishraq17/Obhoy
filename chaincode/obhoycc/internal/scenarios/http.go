package scenarios

import (
	"encoding/json"
	"net/http"
)

// Routes exposes the harness over HTTP so the demonstration surface in the web
// application can fire a scenario and render its transcript.
//
// It is registered separately from the node's own routes because a scenario
// runs against its OWN freshly bootstrapped ledger -- firing S2 must not leave
// a duplicate-refused event sitting in the ledger the operator is browsing.
func Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/scenarios", func(w http.ResponseWriter, r *http.Request) {
		type entry struct {
			ID        string `json:"id"`
			Title     string `json:"title"`
			Criterion string `json:"criterion"`
			Claim     string `json:"claim"`
		}
		out := []entry{}
		for _, s := range All() {
			out = append(out, entry{s.ID, s.Title, s.Criterion, s.Claim})
		}
		write(w, http.StatusOK, map[string]interface{}{"ok": true, "result": out})
	})

	mux.HandleFunc("/api/scenarios/run", func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		if id == "" {
			results := RunAll()
			write(w, http.StatusOK, map[string]interface{}{"ok": true, "result": results})
			return
		}
		res, err := RunOne(id)
		if err != nil {
			write(w, http.StatusNotFound, map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		write(w, http.StatusOK, map[string]interface{}{"ok": true, "result": res})
	})

	return mux
}

func write(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Obhoy-MSP")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
