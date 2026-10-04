// Génère une paire de clés VAPID pour les notifications Web Push.
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.info("Ajoutez ces lignes à votre fichier .env :\n");
console.info(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.info(`VAPID_PRIVATE_KEY=${privateKey}`);
