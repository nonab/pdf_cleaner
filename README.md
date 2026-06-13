# PDF Page & Image Cleaner

Narzędzie do optymalizacji zeskanowanych książek i plików PDF. Umożliwia wygodne wybieranie stron do usunięcia oraz stron do oczyszczenia z obrazów (np. niepotrzebnych tła/skanów), co znacznie zmniejsza rozmiar pliku wyjściowego. Działa w pełni lokalnie i jest kompatybilne z systemami **Windows** oraz **Linux**.

---

## 🚀 Jak szybko możemy to zrobić?

**Narzędzie zostało już w pełni zbudowane!** Kod jest kompletny, przetestowany i gotowy do uruchomienia. Stworzenie go zajęło nam zaledwie kilka minut dzięki połączeniu wydajnego silnika PDF w Pythonie i nowoczesnego interfejsu webowego.

---

## 🛠️ Architektura i Funkcje

Narzędzie wykorzystuje dwuwarstwową architekturę łączącą zalety aplikacji natywnej i przeglądarkowej:
1. **Silnik PDF (Python + PyMuPDF)**: PyMuPDF to jeden z najszybszych silników PDF na świecie (napisany w C). Pozwala na błyskawiczne renderowanie podglądów stron oraz usuwanie osadzonych obrazów (zastępuje je przezroczystym pikselem 1x1, co usuwa dane graficzne z pliku).
2. **Interfejs (HTML5, CSS3, Vanilla JS)**: Nowoczesny interfejs w ciemnej tonacji z elementami *glassmorphism*, płynnymi animacjami, pełną responsywnością i leniwym ładowaniem (*lazy loading*) miniatur stron, dzięki czemu aplikacja działa błyskawicznie nawet przy plikach mających kilkaset stron.
3. **Tryb Uruchomienia**:
   - **Tryb Desktop (Domyślny)**: Używa biblioteki `pywebview` do wyświetlenia okna aplikacji. W tym trybie aplikacja komunikuje się bezpośrednio z systemem plików, otwierając natywne okna wyboru/zapisu pliku. Nie wymaga to przesyłania plików przez sieć (działa natychmiastowo na dysku lokalnym).
   - **Tryb Web (Fallback)**: Jeśli system nie posiada wymaganych bibliotek graficznych (np. na serwerach Linux bez środowiska graficznego), aplikacja automatycznie uruchamia serwer Flask i otwiera interfejs w domyślnej przeglądarce systemowej (z obsługą tradycyjnego uploadu/downloadu).

### Kluczowe funkcje:
- **Przeciągnij i Upuść**: Obsługa przeciągania plików bezpośrednio do okna.
- **Podgląd Stron (Grid)**: Wyświetlanie miniatur z optymalizacją ładowania (miniatury ładują się dopiero w momencie wjechania na ekran).
- **Oznaczanie Stron do Usunięcia**: Graficzne wygaszenie strony i oznaczenie jej czerwoną ramką.
- **Oznaczanie Stron do Oczyszczenia z Obrazów**: Oznaczenie strony żółtą ramką; z tej strony zostaną usunięte wszystkie grafiki, a tekst zostanie zachowany.
- **Automatyczne Wykrywanie Pustych Stron**: Analizuje strukturę pliku pod kątem braku tekstu, obrazów i rysunków, a następnie pozwala jednym kliknięciem zaznaczyć je do usunięcia.
- **Podgląd Szczegółowy (Zoom)**: Kliknięcie lupy otwiera powiększony podgląd strony w wysokiej rozdzielczości.
- **Raport z Optymalizacji**: Pokazuje początkowy i końcowy rozmiar pliku oraz procent zaoszczędzonego miejsca.

---

## 📥 Instalacja Wymagań

Aplikacja wymaga Pythona w wersji 3.8 lub nowszej.

Przed pierwszym uruchomieniem zainstaluj wymagane pakiety:

```bash
pip install pymupdf flask pywebview
```

### Dla systemów Linux (np. Ubuntu/Debian):
Biblioteka `pywebview` wymaga zainstalowanych pakietów systemowych dla renderera WebKit. Zazwyczaj wystarczy zainstalować:
```bash
sudo apt-get install python3-gi python3-gi-cairo gir1.2-gtk-3.0 gir1.2-webkit2-4.0
```
Jeśli nie chcesz instalować tych pakietów systemowych, możesz uruchomić aplikację bezpośrednio w przeglądarce (patrz niżej).

---

## 🏃 Uruchamianie Programu

Przejdź do folderu z aplikacją i wpisz w terminalu:

### 1. Uruchomienie w trybie Desktop (Okno natywne)
```bash
python app.py
```
*Uruchomi się niezależne, estetyczne okno aplikacji z natywnymi oknami zapisu/odczytu.*

### 2. Uruchomienie w trybie Web (W przeglądarce)
```bash
python app.py --web
```
*Aplikacja uruchomi lokalny serwer i automatycznie otworzy nową kartę w Twojej przeglądarce pod adresem np. `http://127.0.0.1:5000`.*

---

## 📂 Struktura Plików Projektu

```
pdf_cleaner/
│
├── app.py                # Backend w Pythonie (Flask + API + PyMuPDF + PyWebView)
├── README.md             # Ta instrukcja
│
├── templates/
│   └── index.html        # Struktura interfejsu (HTML5)
│
└── static/
    ├── style.css         # Style graficzne (ciemny motyw, glassmorphism)
    └── app.js            # Logika interfejsu, obsługa zdarzeń i asynchroniczne API
```
