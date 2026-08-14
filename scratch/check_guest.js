const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = "guest@ambit.ai";
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      inboxItems: true,
      areas: true,
      projects: true,
      subProjects: true,
      tasks: true,
      habits: true,
      settings: true,
    }
  });

  if (!user) {
    console.log("No user found with email guest@ambit.ai");
    return;
  }

  console.log("Found guest user:");
  console.log(`ID: ${user.id}`);
  console.log(`Name: ${user.name}`);
  console.log(`Created At: ${user.createdAt}`);
  console.log(`Inbox Items: ${user.inboxItems.length}`);
  console.log(`Areas: ${user.areas.length}`);
  console.log(`Projects: ${user.projects.length}`);
  console.log(`SubProjects: ${user.subProjects.length}`);
  console.log(`Tasks: ${user.tasks.length}`);
  console.log(`Habits: ${user.habits.length}`);
  console.log(`Settings: ${user.settings ? "Yes" : "No"}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
