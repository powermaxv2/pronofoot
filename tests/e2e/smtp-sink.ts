/**
 * Serveur SMTP de test : reçoit les e-mails (liens magiques) et les expose en HTTP.
 *   SMTP : localhost:${SMTP_SINK_PORT ?? 1025}
 *   HTTP : GET localhost:${SMTP_SINK_HTTP_PORT ?? 1080}/messages?to=adresse
 */
import { createServer } from "node:http";
import { simpleParser } from "mailparser";
import { SMTPServer } from "smtp-server";

type Message = { to: string[]; subject: string; text: string; html: string; receivedAt: string };

const messages: Message[] = [];
const smtpPort = Number(process.env.SMTP_SINK_PORT ?? 1025);
const httpPort = Number(process.env.SMTP_SINK_HTTP_PORT ?? 1080);

const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  logger: false,
  onData(stream, _session, callback) {
    simpleParser(stream)
      .then((mail) => {
        const to = (Array.isArray(mail.to) ? mail.to : mail.to ? [mail.to] : []).flatMap((a) =>
          a.value.map((v) => (v.address ?? "").toLowerCase()),
        );
        messages.push({
          to,
          subject: mail.subject ?? "",
          text: mail.text ?? "",
          html: typeof mail.html === "string" ? mail.html : "",
          receivedAt: new Date().toISOString(),
        });
        callback();
      })
      .catch(callback);
  },
});

const http = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${httpPort}`);
  if (url.pathname === "/messages") {
    const to = url.searchParams.get("to")?.toLowerCase();
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(to ? messages.filter((m) => m.to.includes(to)) : messages));
    return;
  }
  res.statusCode = 404;
  res.end();
});

smtp.listen(smtpPort, () => console.info(`[smtp-sink] SMTP sur ${smtpPort}`));
http.listen(httpPort, () => console.info(`[smtp-sink] HTTP sur ${httpPort}`));
