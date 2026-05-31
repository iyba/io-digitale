# Setup Firebase — 5 minuti

## 1. Crea progetto Firebase
1. Vai su https://console.firebase.google.com
2. Clicca **"Aggiungi progetto"**
3. Dai un nome (es. `io-digitale`) → Continua
4. Disabilita Google Analytics (opzionale) → **Crea progetto**

## 2. Aggiungi app Web
1. Nel progetto, clicca sull'icona **`</>`** (Web)
2. App nickname: `io-digitale`
3. Clicca **"Registra app"**
4. Copia il blocco `firebaseConfig` che appare — ti serve dopo

## 3. Attiva Google Sign-In
1. Nel menu a sinistra: **Autenticazione** → **Inizia**
2. Scheda **Metodo di accesso** → **Google** → Abilita
3. Inserisci una email di supporto → **Salva**

## 4. Crea database Firestore
1. Nel menu: **Firestore Database** → **Crea database**
2. Scegli modalità **Produzione** → Avanti
3. Scegli posizione `eur3 (Europe)` → **Abilita**
4. Vai su **Regole** e sostituisci con:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

5. Clicca **Pubblica**

## 5. Configura le variabili
1. Copia il file `.env.example` → rinominalo `.env`
2. Incolla i valori dal `firebaseConfig` copiato al passo 2:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=io-digitale-xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=io-digitale-xxx
VITE_FIREBASE_STORAGE_BUCKET=io-digitale-xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...
```

## 6. Avvia l'app
```bash
cd io-digitale
npm run dev
```

Poi apri http://localhost:5173 nel browser.

## 7. Deploy (per accesso da telefono)
```bash
npm install -g vercel
vercel
```
Segui le istruzioni → ottieni URL pubblico da aprire sul telefono.
