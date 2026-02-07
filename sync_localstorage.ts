// Script para sincronizar localStorage com dados do backend

console.log('=== SINCRONIZANDO LOCALSTORAGE COM BACKEND ===');

// Dados corretos do backend
const backendData = {
  id: "634b6d84-a825-4f5c-a413-a74be35c5020",
  email: "admin@receit.com",
  name: "Dr. João Silva",
  crm: "CRM-MT 17163",
  created_at: "Sun Jan 25 2026 22:31:29 GMT-0400",
  updated_at: "Fri Jan 30 2026 22:07:54 GMT-0400",
  specialty: "Clínico Geral",
  phone: "(65) 98765-4321"
};

console.log('\n📊 DADOS CORRETOS DO BACKEND:');
console.log('='.repeat(40));
console.log(`Nome: ${backendData.name}`);
console.log(`Email: ${backendData.email}`);
console.log(`CRM: ${backendData.crm}`);
console.log(`Especialidade: ${backendData.specialty}`);
console.log(`Telefone: ${backendData.phone}`);

console.log('\n📱 PARA SINCRONIZAR NO NAVEGADOR:');
console.log('='.repeat(40));
console.log('Copie e cole este código no console do navegador:');

console.log(`
// Sincronizar localStorage com dados do backend
const backendData = ${JSON.stringify(backendData, null, 2)};

// Salvar no localStorage
localStorage.setItem('user_profile', JSON.stringify(backendData));

// Verificar se salvou corretamente
const saved = JSON.parse(localStorage.getItem('user_profile'));
console.log('✅ Dados salvos no localStorage:');
console.log('Nome:', saved.name);
console.log('CRM:', saved.crm);
console.log('Email:', saved.email);

// Recarregar a página para aplicar as mudanças
console.log('\\n🔄 Recarregue a página (F5) para ver as mudanças!');
// location.reload(); // Descomente para recarregar automaticamente
`);
