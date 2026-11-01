// Страница под конструктором: секции в порядке чтения. Якоря — NAV_SECTIONS в Header.tsx.
import { Contacts } from "./Contacts";
import { Faq } from "./Faq";
import { ForHim } from "./ForHim";
import { HowItWorks } from "./HowItWorks";
import { Prices } from "./Prices";
import { Reviews } from "./Reviews";
import { Visit } from "./Visit";
import { Works } from "./Works";
import "./sections.css";

export { Footer } from "./Footer";

export function Sections() {
  return (
    <>
      <HowItWorks />
      <Works />
      <Prices />
      <ForHim />
      <Visit />
      <Faq />
      <Reviews />
      <Contacts />
    </>
  );
}