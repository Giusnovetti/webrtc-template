# Usa l'immagine ufficiale Node.js con Alpine Linux per dimensioni ridotte
FROM node:18-alpine

# Imposta la directory di lavoro nel container
WORKDIR /app

# Copia i file di configurazione delle dipendenze
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il codice sorgente dell'applicazione
COPY . .

# Esponi la porta su cui il server WebSocket è in ascolto
EXPOSE 8080


# Comando per avviare l'applicazione
CMD ["node", "server.js"]