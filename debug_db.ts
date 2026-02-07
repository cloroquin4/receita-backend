import { query } from './src/config/database';

async function debugUsers() {
  try {
    console.log('=== VERIFICANDO ESTRUTURA DA TABELA ===');
    
    // Primeiro, verificar quais colunas existem
    const columnsResult = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 COLUNAS DA TABELA USERS:');
    console.log('='.repeat(40));
    columnsResult.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    
    // Agora buscar os dados com as colunas que existem
    const columns = columnsResult.rows.map(row => row.column_name).join(', ');
    const result = await query(`SELECT ${columns} FROM users ORDER BY created_at DESC LIMIT 5`);
    
    console.log('\n📊 DADOS NO BANCO DE DADOS:');
    console.log('='.repeat(50));
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado no banco');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`\n👤 USUÁRIO ${index + 1}:`);
        Object.entries(user).forEach(([key, value]) => {
          console.log(`   ${key}: ${value || 'NÃO DEFINIDO'}`);
        });
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
