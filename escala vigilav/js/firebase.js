// js/firebase.js

// 1. Importa as funções do Firebase usando o link completo para o navegador
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";

// 2. Suas chaves de configuração, exatamente como você me enviou
const firebaseConfig = {
  apiKey: "AIzaSyBuB6QMZzWATXSl2nY3QTunc6qLXZ5qTKY",
  authDomain: "vigilapp-web.firebaseapp.com",
  projectId: "vigilapp-web",
  storageBucket: "vigilapp-web.appspot.com", // corrigido para o bucket correto
  messagingSenderId: "54193320078",
  appId: "1:54193320078:web:d676eb2b08eef2e7c7d9df",
  measurementId: "G-7B9Z1HN1VM"
};

// 3. Inicializa a conexão com o Firebase
//    Esta é a linha que corrige o erro "No Firebase App has been created".
const app = initializeApp(firebaseConfig);

// 4. Exporta a 'app' para que outros arquivos (como auth.js) possam usá-la.
//    Qualquer outro arquivo que precisar do Firebase importará esta 'app'.
export { app };