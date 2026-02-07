const { query } = require('./src/config/database');

async function debugUsers() {
  try {
    console.log('=== BUSCANDO DADOS DO BANCO ===');
    
    const result = await query('SELECT id, name, email, crm, specialty, phone, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    
    console.log('\n📊 DADOS NO BANCO DE DADOS:');
    console.log('='.repeat(50));
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado no banco');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`\n👤 USUÁRIO ${index + 1}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Nome: ${user.name || 'NÃO DEFINIDO'}`);
        console.log(`   Email: ${user.email || 'NÃO DEFINIDO'}`);
        console.log(`   CRM: ${user.crm || 'NÃO DEFINIDO'}`);
        console.log(`   Especialidade: ${user.specialty || 'NÃO DEFINIDA'}`);
        console.log(`   Telefone: ${user.phone || 'NÃO DEFINIDO'}`);
        console.log(`   Criado em: ${user.created_at}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`📈 Total de usuários: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados:', error);
  } finally {
    process.exit(0);
  }
}

debugUsers();
