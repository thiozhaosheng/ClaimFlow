/**
 * The single source of truth for the corporate Citibank card feed.
 *
 * Both the dashboard card widget and the new-claim "match a card charge"
 * matcher read from here, so "the company card" shows the same transactions
 * everywhere. Categories are REAL claim categories (no coercion), and the
 * amounts/dates are chosen to exercise the policy engine coherently:
 *  - Jumbo Seafood → Client Entertainment > S$300 AND a duplicate of CLM-1042
 *    (same employee/amount/date/merchant) → routes to manager review.
 *  - Grab → Transport ≤ S$50 with receipt → auto-approves.
 *  - Starbucks → Meal ≤ S$30 with receipt → auto-approves.
 */
export interface CardTransaction {
  id: string;
  merchant: string;
  title: string;
  amount: number;
  /** ISO yyyy-mm-dd — used when filing the claim. */
  date: string;
  /** Short display date for the card feed, e.g. "18 Jun". */
  dateLabel: string;
  /** A real claim category (matches CATEGORY_FIELDS / policies). */
  category: string;
  uen: string;
}

export const CITI_CARD_TRANSACTIONS: CardTransaction[] = [
  {
    id: "TXN-2819",
    merchant: "Jumbo Seafood",
    title: "Client dinner — Acme Pte Ltd",
    amount: 318.4,
    date: "2026-06-18",
    dateLabel: "18 Jun",
    category: "Client Entertainment",
    uen: "198701234K",
  },
  {
    id: "TXN-1082",
    merchant: "Grab Taxi SG",
    title: "Grab ride to Suntec client meeting",
    amount: 23.1,
    date: "2026-06-20",
    dateLabel: "20 Jun",
    category: "Transport",
    uen: "201314856E",
  },
  {
    id: "TXN-7740",
    merchant: "Starbucks Coffee",
    title: "Team alignment coffee session",
    amount: 24.8,
    date: "2026-06-24",
    dateLabel: "24 Jun",
    category: "Meal",
    uen: "199602814G",
  },
];
