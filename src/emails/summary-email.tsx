import { Body, Button, Column, Container, Head, Heading, Hr, Html, Preview, Row, Section, Text } from "@react-email/components";
import type { SummaryPayload } from "@/lib/summary/daily";

// The 9 AM email: yesterday's journal page, in the app's voice. Inline styles for email clients.
const paper = "#fffbfd";
const ink = "#5b4664";
const soft = "#6a5673";
const satin = "#ffc4dc";
const rule = "#f1dce7";
const serif = "'Young Serif', Georgia, 'Times New Roman', serif";
const sans = "'Atkinson Hyperlegible Next', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const tnum = { fontVariantNumeric: "tabular-nums" as const };

export function summarySubject(s: SummaryPayload): string {
  if (s.empty) return "Yesterday's page in Bloom";
  const parts = [`Yesterday: ${s.tally.split(" · ")[0]}`];
  const notTaken = s.servingLines.filter((l) => l.missed).map((l) => l.text.split(":")[0]);
  if (notTaken.length) parts.push(`${notTaken.join(", ")} not taken`);
  return parts.join(" · ");
}

export function SummaryEmail({ summary: s, recipientName, appUrl }: { summary: SummaryPayload; recipientName: string; appUrl: string }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`${s.note} ${s.tally}`}</Preview>
      <Body style={{ backgroundColor: paper, margin: 0, padding: "24px 0", fontFamily: sans, color: ink }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "0 20px" }}>
          <Text style={{ fontFamily: serif, fontSize: 18, margin: "0 0 20px", color: soft }}>Bloom</Text>
          <Text style={{ fontSize: 16, margin: "0 0 4px", color: soft }}>Good morning, {recipientName}.</Text>
          <Heading as="h1" style={{ fontFamily: serif, fontWeight: 400, fontSize: 30, lineHeight: "1.15", margin: "0 0 4px" }}>
            Yesterday&apos;s page
          </Heading>
          <Text style={{ fontSize: 16, margin: "0 0 20px", color: soft }}>
            {s.longLabel}
            {s.weekLabel ? ` · ${s.weekLabel}` : ""}
          </Text>

          {s.empty ? (
            <Text style={{ fontFamily: serif, fontSize: 20, lineHeight: "1.4", margin: "0 0 20px" }}>{s.note}</Text>
          ) : (
            <>
              <Section style={{ margin: "0 0 8px" }}>
                <Row>
                  <Column style={{ width: 120, verticalAlign: "middle" }}>
                    <Text style={{ fontFamily: serif, fontSize: 44, lineHeight: "1", margin: 0, ...tnum }}>{`${s.pct}%`}</Text>
                    <Text style={{ fontSize: 14, margin: "4px 0 0", color: soft }}>on time</Text>
                  </Column>
                  <Column style={{ verticalAlign: "middle" }}>
                    <Text style={{ fontFamily: serif, fontSize: 20, lineHeight: "1.35", margin: 0 }}>{s.note}</Text>
                  </Column>
                </Row>
              </Section>
              <Hr style={{ borderColor: rule, margin: "16px 0 12px" }} />
              <Text style={{ fontSize: 16, margin: "0 0 6px", ...tnum }}>{s.tally}</Text>
              {s.servingLines.map((l) => (
                <Text key={l.text} style={{ fontSize: 16, margin: "0 0 6px", color: l.missed ? satin : ink, fontWeight: l.missed ? 600 : 400 }}>{l.text}</Text>
              ))}
              {s.streak > 1 ? <Text style={{ fontSize: 16, margin: "0 0 6px", color: soft }}>{s.streak} clean days in a row</Text> : null}

              <Section style={{ margin: "20px 0 0" }}>
                {s.rows.map((r, i) => (
                  <Row key={i} style={{ borderTop: `1px solid ${rule}` }}>
                    <Column style={{ width: 84, padding: "10px 12px 10px 0", textAlign: "right", verticalAlign: "top", fontSize: 15, color: r.estimated ? soft : ink, ...tnum }}>{r.time}</Column>
                    <Column style={{ padding: "10px 0", verticalAlign: "top" }}>
                      <Text style={{ margin: 0, fontSize: 16, fontFamily: r.kind === "meal" ? serif : sans, textDecoration: r.state === "skipped" ? "line-through" : "none", color: r.state === "skipped" || r.state === "missed" ? soft : ink }}>
                        {r.title}
                      </Text>
                      {r.note ? <Text style={{ margin: 0, fontSize: 14, color: soft }}>{r.note}</Text> : null}
                    </Column>
                    <Column style={{ width: 110, padding: "10px 0", textAlign: "right", verticalAlign: "top", fontSize: 14, color: r.state === "missed" ? satin : soft }}>{r.stateWord}</Column>
                  </Row>
                ))}
              </Section>
            </>
          )}

          <Section style={{ margin: "28px 0" }}>
            <Button href={appUrl} style={{ backgroundColor: satin, color: "#4a3553", fontSize: 17, fontWeight: 600, padding: "16px 24px", borderRadius: 999, display: "block", textAlign: "center" }}>
              Open Bloom
            </Button>
          </Section>
          <Hr style={{ borderColor: rule, margin: "8px 0 12px" }} />
          <Text style={{ fontSize: 13, color: soft, margin: 0 }}>Bloom is a reminder and logging tool, not medical advice. Changes to the regimen come from the OB.</Text>
        </Container>
      </Body>
    </Html>
  );
}
