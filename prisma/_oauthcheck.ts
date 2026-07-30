import * as dotenv from "dotenv"; import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { linkOAuthUser } from "@/lib/oauth";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

let pass=0, fail=0;
const ok=(n:string,c:boolean,got?:unknown)=>{c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} → ${JSON.stringify(got)}`));};

(async () => {
  const stamp = Date.now();
  const email = `oauth.${stamp}@example.com`;

  console.log("\n── New user via OAuth");
  const a = await linkOAuthUser({ provider:"google", email, emailVerified:true, name:"scott walls", image:"https://img/x.png" });
  ok("created", a.ok && a.created === true, a);
  const u1 = await prisma.user.findUnique({ where: { email } });
  ok("email_verified set", u1?.email_verified != null);
  ok("name capitalized", u1?.first_name === "Scott" && u1?.last_name === "Walls", [u1?.first_name, u1?.last_name]);
  ok("image stored", u1?.image === "https://img/x.png");
  ok("no password hash", u1?.password_hash === null);
  ok("provider recorded", !!u1?.oauth_providers.includes("google"));

  console.log("\n── Same person, MIXED CASE email, different provider");
  const b = await linkOAuthUser({ provider:"linkedin", email: email.toUpperCase(), emailVerified:true, name:"Scott Walls", image:"https://img/y.png" });
  ok("linked, not created", b.ok && b.created === false, b);
  const count = await prisma.user.count({ where: { email: { equals: email, mode: "insensitive" } } });
  ok("NO duplicate row", count === 1, count);
  const u2 = await prisma.user.findUnique({ where: { email } });
  ok("both providers recorded", u2?.oauth_providers.slice().sort().join(",") === "google,linkedin", u2?.oauth_providers);
  ok("existing image NOT overwritten", u2?.image === "https://img/x.png", u2?.image);

  console.log("\n── Security gates");
  const unver = await linkOAuthUser({ provider:"google", email:`unver.${stamp}@example.com`, emailVerified:false, name:"X" });
  ok("unverified email refused", !unver.ok && unver.reason === "unverified_email", unver);
  ok("no user created for unverified", (await prisma.user.count({ where:{ email:`unver.${stamp}@example.com` }})) === 0);
  const noEmail = await linkOAuthUser({ provider:"apple", email:null, emailVerified:true });
  ok("missing email refused", !noEmail.ok && noEmail.reason === "no_email", noEmail);

  await prisma.user.update({ where: { email }, data: { locked: true } });
  const locked = await linkOAuthUser({ provider:"google", email, emailVerified:true });
  ok("locked account refused", !locked.ok && locked.reason === "locked", locked);

  console.log("\n── Linking onto an existing PASSWORD account");
  const pwEmail = `pw.${stamp}@example.com`;
  await prisma.user.create({ data: { email: pwEmail, password_hash: "$2a$10$fake", first_name: "Existing", last_name: "Name", role: "MEMBER" } });
  const c = await linkOAuthUser({ provider:"google", email: pwEmail.toUpperCase(), emailVerified:true, name:"Different Person", image:"https://img/z.png" });
  ok("linked to password account", c.ok && c.created === false, c);
  const u3 = await prisma.user.findUnique({ where: { email: pwEmail } });
  ok("typed name preserved", u3?.first_name === "Existing" && u3?.last_name === "Name", [u3?.first_name,u3?.last_name]);
  ok("email now verified", u3?.email_verified != null);
  ok("password still intact", u3?.password_hash === "$2a$10$fake");

  await prisma.user.deleteMany({ where: { email: { in: [email, pwEmail] } } });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})().finally(() => prisma.$disconnect());
