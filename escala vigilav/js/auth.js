// js/auth.js

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { app } from './firebase.js';

/**
 * Registra um novo usuário e cria seu perfil básico no Firestore.
 */
export async function registerUser({ username, email, password }) {
    try {
        const auth = getAuth(app);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const db = getFirestore(app);
        const userDocRef = doc(db, "users_v1", user.uid);
        
        await setDoc(userDocRef, {
            uid: user.uid,
            username: username.toLowerCase().replace(/\s+/g, ''),
            displayName: username,
            email: user.email,
            photoURL: null,
            createdAt: serverTimestamp(),
            activeCompanyId: null,
            activeRole: null
        });
        
        console.log("Usuário registrado com sucesso:", user.uid);
        return { success: true, user: user };

    } catch (error) {
        console.error("Erro no registro:", error);
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, error: 'Este e-mail já está em uso.' };
        }
        return { success: false, error: 'Ocorreu um erro ao criar a conta.' };
    }
}

/**
 * Realiza o login do usuário com e-mail e senha.
 */
export async function login(email, password) {
    // Adicionamos logs para ver o que está sendo recebido
    console.log(`Tentando logar com E-mail: ${email}`);
    
    // Verifica se os parâmetros não estão vazios
    if (!email || !password) {
        console.error("Tentativa de login com e-mail ou senha vazios.");
        return null;
    }

    try {
        const auth = getAuth(app);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login bem-sucedido no Firebase:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        // Log detalhado do erro
        console.error("Erro no Firebase Auth (signInWithEmailAndPassword):", error.code, error.message);
        return null; // Retorna nulo para indicar que o login falhou
    }
}

/**
 * Envia um e-mail para o usuário redefinir sua senha.
 */
export async function sendPasswordReset(email) {
    try {
        const auth = getAuth(app);
        await sendPasswordResetEmail(auth, email);
        console.log("E-mail de redefinição enviado para:", email);
        return true;
    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição:", error);
        return false;
    }
}

/**
 * Observa o estado de autenticação e resolve quando o estado inicial é conhecido.
 */
export function checkAuthState() {
    return new Promise((resolve) => {
        const auth = getAuth(app);
        // onAuthStateChanged dispara imediatamente com o estado atual.
        // Se o usuário acabou de se registrar, o SDK pode levar um instante
        // para persistir o estado. Este listener aguarda por isso.
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Para de ouvir após obter o primeiro resultado para não causar loops
            if (user) {
                console.log("checkAuthState encontrou usuário:", user.uid);
            } else {
                console.log("checkAuthState não encontrou usuário.");
            }
            resolve(user);
        });
    });
}

/**
 * Desloga o usuário atualmente autenticado.
 */
export async function logout() {
    try {
        const auth = getAuth(app);
        await signOut(auth);
        console.log("Usuário deslogado com sucesso.");
    } catch (error) {
        console.error("Erro ao deslogar:", error);
    }
}