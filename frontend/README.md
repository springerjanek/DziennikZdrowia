# Dziennik Zdrowia — frontend

Aplikacja webowa do profilaktyki zdrowotnej. Ta część to interfejs użytkownika:
onboarding, plan badań profilaktycznych i logowanie.

## Wymagania

- **Node.js** `^20.19.0` lub `>=22.12.0` (wymóg Vite 8)
- npm

## Uruchomienie lokalne

```bash
cd frontend
npm install
cp .env.example .env     # uzupełnij wartości
npm run dev
```

Aplikacja uruchamia się domyślnie na `http://localhost:5173`.

Logowanie wymaga backendu (`../backend`, domyślnie `http://localhost:8080`),
a backend bazy PostgreSQL: `docker compose up -d` w głównym katalogu repo.
Vite przekazuje do niego wszystkie zapytania `/api/*` (proxy w `vite.config.ts`),
więc front i API działają pod jednym adresem, a sesja jest w ciasteczku HttpOnly.
Inny adres backendu: `BACKEND_URL=http://... npm run dev`.

## Zmienne środowiskowe

| zmienna                 | opis                                                |
| ----------------------- | --------------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID` | Identyfikator klienta OAuth z Google Cloud Console. Backend dostaje ten sam w `GOOGLE_CLIENT_ID`. Client secret nie jest potrzebny. |

## Polecenia

| polecenie         | co robi                                          |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | serwer deweloperski z hot reloadem               |
| `npm run build`   | sprawdzenie typów (`tsc -b`) i build produkcyjny |
| `npm run lint`    | ESLint                                           |
| `npm run preview` | podgląd zbudowanej wersji                        |

`npm run build` jest też najszybszym sposobem sprawdzenia, czy nic nie zepsułeś —
sprawdza typy w całym projekcie.

## Struktura

```
src/
  domain/      model biznesowy
  features/    moduły produktowe
  components/  komponenty wspólne
  pages/       widoki stron
  auth/        logowanie Google, sesja
  data/        źródła danych
  lib/         funkcje pomocnicze
  app/         router
```
