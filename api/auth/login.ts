export default function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email, password } = req.body || {};
  const normalizedEmail = (email || "").trim().toLowerCase();
  const normalizedPass = (password || "").trim();

  if (!normalizedEmail || !normalizedPass) {
    return res.status(400).json({ ok: false, error: "Email dan kata sandi wajib diisi." });
  }

  // Master bypass passwords & users
  const isMasterPassword = [
    "1834561",
    "Admin#2026",
    "legaladmin",
    "legalstaff",
    "admin",
    "admin123",
    "Admin123",
    "ajinomoto",
    "password",
    "123456"
  ].includes(normalizedPass);

  const isWahyu = 
    normalizedEmail.includes("wahyu") || 
    normalizedEmail.includes("kurniawan") || 
    normalizedEmail === "admin@ajinomoto.co.id" ||
    normalizedEmail === "wahyukurniawan2592@gmail.com" ||
    normalizedEmail === "wahyu.kurniawan.kp5@asv.ajinomoto.com";

  if (isWahyu) {
    return res.status(200).json({
      ok: true,
      user: {
        UserID: "usr1",
        Name: "Wahyu Waullilamri Kurniawan",
        Email: email,
        Role: "Administrator",
        Status: "Active"
      }
    });
  }

  // Default corporate account
  const derivedName = normalizedEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const role = (isMasterPassword || normalizedPass.toLowerCase().includes("admin")) ? "Administrator" : "Staff";

  return res.status(200).json({
    ok: true,
    user: {
      UserID: "usr_" + Date.now(),
      Name: derivedName + (role === "Staff" ? " (Legal Staff)" : " (Admin)"),
      Email: email,
      Role: role,
      Status: "Active"
    }
  });
}
