// hash-generator.js
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('--- TFC CRM 密碼加密產生器 ---');
rl.question('請輸入您想設定的新密碼 (例如: tfc-crm-2025): ', (password) => {
  if (!password) {
    console.error('錯誤：未輸入密碼。');
    rl.close();
    return;
  }

  // 產生加密鹽值並進行加密
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  console.log('\n================================================================');
  console.log('✅ 加密完成！');
  console.log('請將以下這整行 Hash 複製到您的 config.js 檔案中，取代 LOGIN_HASH 的值：');
  console.log(`\n'${hash}'\n`);
  console.log('================================================================');
  
  rl.close();
});