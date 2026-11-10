import { PRODUCT_IDS } from '@/lib/constants';
import type { FaqItem } from '@/components/product/ProductFaq';

const common: FaqItem[] = [
  {
    q: 'How do I measure my door for a euro cylinder?',
    a: 'Measure in millimetres from the centre of the fixing screw to each end of your existing cylinder. The inside (room side) measurement is A, the outside is B. Round up to the nearest size we stock. Most composite and uPVC doors take 35 / 35.',
  },
  {
    q: 'What does the 3 Star Kitemark mean?',
    a: 'BSI Kitemark TS 007 3 Star is the highest rating for a euro cylinder sold on its own. It means the cylinder has passed independent tests for snapping, drilling, picking, bumping and plug extraction without needing a security handle.',
  },
  {
    q: 'Is a Watchdog lock insurance approved?',
    a: 'Watchdog cylinders carry the BSI Kitemark TS 007 3 Star, Sold Secure Diamond 2024 and Secured by Design accreditations, which are the standards insurers typically ask for. Check your policy wording or ask your insurer whether a reduced premium applies.',
  },
  {
    q: 'Can I fit it myself?',
    a: 'Yes. Open the door, remove the single fixing screw on the door edge, slide the old cylinder out with the key turned slightly, slide the Watchdog in and refit the screw. Most people are done in five minutes with a Phillips screwdriver.',
  },
  {
    q: 'How many keys are included and can I get more?',
    a: 'Every lock ships with three keys. Extra keys are cut to the key number engraved on your key, so order them from the Extra Keys product and enter that number at checkout.',
  },
  {
    q: 'When will my order arrive?',
    a: 'Orders placed before 3pm Monday to Friday are dispatched the same working day. Choose Royal Mail 1st Class Signed For (3–5 working days), Special Delivery 24hr or Saturday Delivery at checkout.',
  },
  {
    q: 'What is the £5,000 security guarantee?',
    a: 'Register your lock at wdlocks.co.uk/guarantee-registration after fitting. Registration activates KeyControl, which stops unauthorised key copying, and your £5,000 security guarantee.',
  },
];

const thumbTurn: FaqItem[] = [
  {
    q: 'Should I choose a thumb turn or a key-key cylinder?',
    a: 'A thumb turn lets you lock and unlock from inside without a key, which is useful for fire escape and for families. Choose key-key if the door has glass nearby that could be broken to reach the turn.',
  },
];

const rim: FaqItem[] = [
  {
    q: 'Which doors use a rim cylinder?',
    a: 'Rim cylinders fit nightlatches (Yale-type locks) on timber doors. Choose the brass or nickel finish to match your existing hardware.',
  },
];

export function faqsForProduct(productId: number): FaqItem[] {
  if (productId === PRODUCT_IDS.THUMB_TURN) return [...thumbTurn, ...common];
  if (productId === PRODUCT_IDS.RIM_CYLINDER) return [...rim, ...common.filter((f) => !f.q.startsWith('How do I measure'))];
  return common;
}
