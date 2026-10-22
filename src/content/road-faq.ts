// RD-E006: short Q&As per provider-road stop, keyed like PROVIDER_ROAD (/help/road#<key>).
export const ROAD_FAQ: Record<string, { q: string; a: string }[]> = {
  register: [
    { q: "Why do I add a company when I sign up?", a: "Panameer contracts with and pays companies, not individuals. A one-person business is a company too: use your business name, website and industry." },
    { q: "My company is already on Panameer. What do I do?", a: "Enter its website. If it's already here, ask to join and an admin there approves you." },
    { q: "Do I need tax details now?", a: "No. Payout details come last — just before Get Paid, and only what your country needs." },
  ],
  verify: [
    { q: "I didn't get the email.", a: "Check spam, then use Resend on the Verify Your Email screen. The link works once." },
    { q: "What does verifying unlock?", a: "Learn and Connect open right away, and you can keep building your profile." },
  ],
  profile: [
    { q: "What counts as a complete profile?", a: "No empty sections: photo, bio, 3 skills, a specialization, rate, language and location. Your Search Score shows what's left." },
    { q: "Why is this a gate?", a: "Buyers find you through your profile, so it has to be complete before you show up in search and can say you want a job." },
  ],
  list: [
    { q: "What's the difference between a service and a service product?", a: "A service is your rate for a kind of work (say, Onsite Consulting per hour). A service product is a fixed scope at a listed price that buyers can buy right away." },
    { q: "When do they go live?", a: "As soon as you publish, once your company is linked. No Panameer review." },
  ],
  sell: [
    { q: "What are the three ways to win work?", a: "5.A a buyer buys your service product; 5.B a buyer hires you at your rate after you said you want their job; 5.C a buyer accepts the estimate you sent. Each ends in a signed work order." },
    { q: "Can buyers negotiate?", a: "Only if you want them to. Orders at your price and date open at once. Turn on \"Open to offers on price and delivery\" (or open a single product or service) and buyers can propose a different price or date; you accept, counter once, or decline." },
    { q: "Do I need a W-9 or tax ID to sell?", a: "No. Selling, signing work orders and requesting payment only need a linked company. Payout details are asked for just before you get paid." },
  ],
  deliver: [
    { q: "When is a work order delivered?", a: "When the buyer accepts the deliverable or approves your timesheet. Keep the tracker up to date on the work order as you go." },
    { q: "What if the buyer asks for changes?", a: "Make them and send the update from the work order; the buyer accepts when it's done." },
  ],
  request: [
    { q: "How do I request payment?", a: "From the work order: submit a timesheet for rate work, or report a milestone (delivered, installed…) for a service product." },
    { q: "When is the buyer due to pay?", a: "Payment terms start when the request goes to the buyer, for example Net 30." },
  ],
  paid: [
    { q: "What does the lock before Get Paid mean?", a: "Before the first payout we need a payout account in your company's legal name, plus Tax ID and tax form where your country's rule needs them (US: W-9 + Tax ID). Requests made before that wait, then go out automatically." },
    { q: "Where does the money go?", a: "To your company's bank account in its legal name, after the buyer pays Panameer." },
    { q: "What does Panameer keep?", a: "The fee shown on your work order. The rest is paid out to your company." },
  ],
};
