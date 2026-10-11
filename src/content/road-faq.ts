// RD-E006: short Q&As per provider-road stop, keyed like PROVIDER_ROAD (/help/road#<key>).
export const ROAD_FAQ: Record<string, { q: string; a: string }[]> = {
  register: [
    { q: "Why do I add a company when I sign up?", a: "Panameer contracts with and pays companies, not individuals. A one-person business is a company too: use your business name, website and industry." },
    { q: "My company is already on Panameer. What do I do?", a: "Enter its website. If it's already here, ask to join and an admin there approves you." },
    { q: "Do I need tax details now?", a: "No. Tax and banking come later, once you have a signed work order (stop 6)." },
  ],
  verify: [
    { q: "I didn't get the email.", a: "Check spam, then use Resend on the Check Your Email screen. The link works once." },
    { q: "What does verifying unlock?", a: "Learn and Connect open right away, and you can keep building your profile." },
  ],
  profile: [
    { q: "What counts as a complete profile?", a: "No empty sections: photo, bio, 3 skills, a specialization, rate, language and location. Your Search Score shows what's left." },
    { q: "Why is this a gate?", a: "Buyers find you through your profile, so it has to be complete before you show up in search and can propose." },
  ],
  list: [
    { q: "What's the difference between a service and a service product?", a: "A service is your rate for a kind of work (say, Onsite Consulting per hour). A service product is a fixed scope at a listed price that buyers can buy right away." },
    { q: "When do they go live?", a: "As soon as you publish, once your company is linked. No Panameer review." },
  ],
  contract: [
    { q: "What are the three ways to win work?", a: "5.A a buyer buys your service product; 5.B a buyer accepts the rate you proposed on their work request; 5.C a buyer accepts the cost estimate you sent. Each ends in a signed work order." },
    { q: "Do I have to accept every product order?", a: "No. Orders open automatically by default; turn on \"I accept orders manually\" under My Service Products to review each one first." },
    { q: "Can I sign before my company is validated?", a: "Yes. You can sign now; add tax and banking so your payment requests can go out." },
  ],
  validate: [
    { q: "What's needed?", a: "Your company's legal name and tax ID, the tax form (W-9 in the US, W-8BEN-E outside it) and a payout account in the company's legal name." },
    { q: "What happens to payment requests before this is done?", a: "They're saved and marked Waiting on Tax & Banking. They go to the buyer automatically once your company is validated." },
  ],
  request: [
    { q: "How do I request payment?", a: "From the work order: submit a timesheet for rate work, or report a milestone (delivered, installed…) for a service product." },
    { q: "When is the buyer due to pay?", a: "Payment terms start when the request goes to the buyer, for example Net 30." },
  ],
  paid: [
    { q: "Where does the money go?", a: "To your company's bank account in its legal name, after the buyer pays Panameer." },
    { q: "What does Panameer keep?", a: "The fee shown on your work order. The rest is paid out to your company." },
  ],
};
