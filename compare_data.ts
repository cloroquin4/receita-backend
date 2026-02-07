// Script para comparar dados do backend vs localStorage

console.log('=== COMPARAÇÃO: BACKEND vs LOCALSTORAGE ===');

// Dados do backend (do resultado anterior)
const backendData = {
  id: "634b6d84-a825-4f5c-a413-a74be35c5020",
  email: "admin@receit.com",
  name: "Dr. João Silva",
  crm: "CRM-MT 17163",
  created_at: "Sun Jan 25 2026 22:31:29 GMT-0400",
  updated_at: "Fri Jan 30 2026 22:07:54 GMT-0400"
};

// Simular dados do localStorage (vamos pedir para o usuário colar)
console.log('\n📊 DADOS DO BACKEND:');
console.log('='.repeat(40));
console.log(`ID: ${backendData.id}`);
console.log(`Nome: ${backendData.name}`);
console.log(`Email: ${backendData.email}`);
console.log(`CRM: ${backendData.crm}`);
console.log(`Criado: ${backendData.created_at}`);
console.log(`Atualizado: ${backendData.updated_at}`);

console.log('\n📱 PARA COMPARAR COM LOCALSTORAGE:');
console.log('='.repeat(40));
console.log('Abra o console do navegador e execute:');
console.log('localStorage.getItem("user_profile")');
console.log('');
console.log('Ou copie e cole aqui o resultado para comparação:');

console.log(`
// Exemplo de como comparar no console do navegador:
const backend = ${JSON.stringify(backendData, null, 2)};
const local = JSON.parse(localStorage.getItem("user_profile"));

console.log("=== COMPARAÇÃO ===");
console.log("Nome - Backend:", backend.name);
console.log("Nome - Local:", local.name);
console.log("CRM - Backend:", backend.crm);
console.log("CRM - Local:", local.crm);
console.log("Email - Backend:", backend.email);
console.log("Email - Local:", local.email);

console.log("São iguais?", 
  backend.name === local.name && 
  backend.crm === local.crm && 
  backend.email === local.email
);
`);
