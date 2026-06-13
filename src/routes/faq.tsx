import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQS } from "@/lib/data";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "FAQ — Genuine Investment" }, { name: "description", content: "Answers about risk management, deposits, withdrawals and how investing works." }] }),
  component: FAQ,
});

function FAQ() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl font-bold">Frequently asked questions</h1>
      <p className="mt-3 text-muted-foreground">Risk management, deposits, withdrawals and the fundamentals of investing.</p>
      <Accordion type="single" collapsible className="mt-8">
        {FAQS.map((f, i) => (
          <AccordionItem key={i} value={`i-${i}`}>
            <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
