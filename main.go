package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/olahol/melody"
)

type GopherInfo struct {
	ID, X, Y string
}

type AgendaItem struct {
	Index    int64
	Title    string
	IsActive bool
	IsDone   bool
}

type Agena struct {
	Items []*AgendaItem
}

func main() {
	m := melody.New()

	agenda := Agena{}
	agenda.Items = append(agenda.Items, &AgendaItem{
		Index:    0,
		Title:    "Top 1",
		IsActive: true,
		IsDone:   false,
	})
	agenda.Items = append(agenda.Items, &AgendaItem{
		Index:    1,
		Title:    "Top 2",
		IsActive: false,
		IsDone:   false,
	})
	agenda.Items = append(agenda.Items, &AgendaItem{
		Index:    2,
		Title:    "Top 3",
		IsActive: false,
		IsDone:   false,
	})

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "index.html")
	})

	http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("./assets/"))))

	http.HandleFunc("/script.js", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "script.js")
	})

	http.HandleFunc("/p5.min.js", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "p5.min.js")
	})

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		m.HandleRequest(w, r)
	})

	m.HandleConnect(func(s *melody.Session) {
		ss, _ := m.Sessions()

		ident := []byte(`bytes `)
		b, _ := json.Marshal(agenda)
		b = append(ident, b...)
		s.Write(b)

		for _, o := range ss {
			value, exists := o.Get("info")

			if !exists {
				continue
			}

			info := value.(*GopherInfo)

			s.Write([]byte("set " + info.ID + " " + info.X + " " + info.Y))
		}

		id := uuid.NewString()

		s.Write([]byte("iam " + id))
	})

	m.HandleDisconnect(func(s *melody.Session) {
		value, exists := s.Get("info")

		if !exists {
			return
		}

		info := value.(*GopherInfo)

		m.BroadcastOthers([]byte("dis "+info.ID), s)
	})

	m.HandleMessage(func(s *melody.Session, msg []byte) {
		if strings.HasPrefix(string(msg), "$SET:") {
			idx := strings.TrimPrefix(string(msg), "$SET:")
			i, err := strconv.Atoi(idx)
			if err != nil {
				return
			}

			for _, it := range agenda.Items {
				if int64(i) == it.Index {
					it.IsActive = true
				} else {
					it.IsActive = false
				}
			}

			ident := []byte(`bytes `)
			b, _ := json.Marshal(agenda)
			b = append(ident, b...)
			s.Write(b)
			m.BroadcastOthers(b, s)
		}

		p := strings.Split(string(msg), " ")
		value, exists := s.Get("info")

		if len(p) != 2 || !exists {
			return
		}

		info := value.(*GopherInfo)
		info.X = p[0]
		info.Y = p[1]

		m.BroadcastOthers([]byte("set "+info.ID+" "+info.X+" "+info.Y), s)
	})

	fmt.Println("listening on port 5000")
	http.ListenAndServe(":5000", nil)
}
