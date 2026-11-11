const path = require('path');
const dotenv = require(path.resolve(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.count();
  const accounts = await prisma.account.count();
  const settings = await prisma.settings.count();
  const tasks = await prisma.task.count();
  const captures = await prisma.capture.count();
  const notes = await prisma.note.count();
  const habits = await prisma.habit.count();
  const logs = await prisma.habitLog.count();
  console.log(JSON.stringify({ users, accounts, settings, tasks, captures, notes, habits, logs }, null, 2));
  await prisma.$disconnect();
}
check();
