import bcrypt from 'bcrypt';

async function main() {
  const password = 'Admin@123';

  const hash = await bcrypt.hash(password, 12);

  console.log('\nPassword:', password);
  console.log('Hash:', hash);
}

main();