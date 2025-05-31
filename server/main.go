package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/gorilla/mux"
)

type Subscription struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

var subscriptions []Subscription

func main() {
	r := mux.NewRouter()

	// Статические файлы
	fs := http.FileServer(http.Dir("public"))
	r.PathPrefix("/").Handler(fs)

	// API endpoints
	r.HandleFunc("/api/subscribe", handleSubscribe).Methods("POST")
	r.HandleFunc("/api/unsubscribe", handleUnsubscribe).Methods("POST")

	// Запуск сервера
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Запуск горутины для отправки напоминаний
	go sendReminders()

	log.Printf("Сервер запущен на порту %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func handleSubscribe(w http.ResponseWriter, r *http.Request) {
	var sub Subscription
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	subscriptions = append(subscriptions, sub)
	w.WriteHeader(http.StatusOK)
}

func handleUnsubscribe(w http.ResponseWriter, r *http.Request) {
	var sub Subscription
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Удаление подписки
	for i, s := range subscriptions {
		if s.Endpoint == sub.Endpoint {
			subscriptions = append(subscriptions[:i], subscriptions[i+1:]...)
			break
		}
	}

	w.WriteHeader(http.StatusOK)
}

func sendReminders() {
	ticker := time.NewTicker(2 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		for _, sub := range subscriptions {
			// Создание VAPID ключей (в реальном приложении должны быть сохранены)
			vapidPrivateKey := os.Getenv("VAPID_PRIVATE_KEY")
			vapidPublicKey := os.Getenv("VAPID_PUBLIC_KEY")

			// Создание push-уведомления
			sub := webpush.Subscription{
				Endpoint: sub.Endpoint,
				Keys: webpush.Keys{
					P256dh: sub.Keys.P256dh,
					Auth:   sub.Keys.Auth,
				},
			}

			// Отправка уведомления
			resp, err := webpush.SendNotification([]byte("Напоминание: проверьте ваши невыполненные задачи!"), &sub, &webpush.Options{
				VAPIDPrivateKey: vapidPrivateKey,
				VAPIDPublicKey:  vapidPublicKey,
				TTL:             30,
			})

			if err != nil {
				log.Printf("Ошибка отправки уведомления: %v", err)
				continue
			}
			defer resp.Body.Close()
		}
	}
}
