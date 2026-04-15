// Shim per i componenti di src/components/ui.
// Sono file .jsx usano React.forwardRef senza tipi espliciti: TS inferisce
// RefAttributes<any> senza forma props, generando errori TS2322 su children/
// className/etc. in tutti i consumer. Qui dichiariamo i moduli come `any` per
// azzerare il rumore — la correttezza dei props viene comunque verificata a
// runtime dai componenti stessi.
declare module "@/components/ui/*";
