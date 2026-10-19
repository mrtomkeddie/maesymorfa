'use client';

import { useLanguage } from './../LanguageProvider';
import { Mail, BookOpen, Leaf, Puzzle, Users } from "lucide-react";
import Link from 'next/link';
import { PageHeader } from '@/components/public/PageHeader';
import { CardCue, Tile, TileLabel, TileTitle, TONES, type Tone } from '@/components/public/Tiles';

// Each stage keeps its own colour, so the overview and the stage pages match
const STAGE_TONES: Tone[] = ['amber', 'sky', 'violet', 'emerald'];

const content = {
  en: {
    title: "Curriculum at Maes Y Morfa",
    intro: "At Maes Y Morfa Primary, our curriculum is designed to nurture curiosity, inspire creativity, and equip children with the skills they need for the future. Explore what your child will learn at each stage.",
    stages: [
      {
        icon: Puzzle,
        label: "Nursery & Reception",
        title: "Progression Step 1",
        summary: "Learning through play, building strong foundations in literacy and numeracy in a nurturing environment.",
        href: "/curriculum/early-years"
      },
      {
        icon: BookOpen,
        label: "Years 1, 2 & 3",
        title: "Progression Step 2",
        summary: "Developing core skills in reading, writing, and maths while exploring a broad and balanced range of subjects.",
        href: "/curriculum/key-stage-1"
      },
      {
        icon: Users,
        label: "Years 4, 5 & 6",
        title: "Progression Step 3",
        summary: "Fostering independent learning and deeper subject knowledge to prepare pupils for their transition to secondary school.",
        href: "/curriculum/key-stage-2"
      },
      {
        icon: Leaf,
        label: "Trips, clubs & outdoor learning",
        title: "Beyond the Classroom",
        summary: "Enriching the curriculum through outdoor learning, educational trips, and a wide variety of after-school clubs.",
        href: "/curriculum/beyond-the-classroom"
      }
    ],
    details: "What we learn",
    learnMoreTitle: "Learn More",
    learnMoreBody: "Have a question about our curriculum? We'd love to hear from you. Please contact the school office to speak to a member of staff.",
    contactUs: "Contact Us"
  },
  cy: {
    title: "Cwricwlwm ym Maes Y Morfa",
    intro: "Ym Maes Y Morfa, mae ein cwricwlwm wedi'i gynllunio i feithrin chwilfrydedd, ysbrydoli creadigrwydd, a rhoi'r sgiliau sydd eu hangen ar blant ar gyfer y dyfodol. Archwiliwch beth fydd eich plentyn yn ei ddysgu ar bob cam.",
    stages: [
      {
        icon: Puzzle,
        label: "Meithrin a Derbyn",
        title: "Cam Cynnydd 1",
        summary: "Dysgu drwy chwarae, adeiladu sylfeini cryf mewn llythrennedd a rhifedd mewn amgylchedd meithringar.",
        href: "/curriculum/early-years"
      },
      {
        icon: BookOpen,
        label: "Blynyddoedd 1, 2 a 3",
        title: "Cam Cynnydd 2",
        summary: "Datblygu sgiliau craidd mewn darllen, ysgrifennu, a mathemateg wrth archwilio ystod eang a chytbwys o bynciau.",
        href: "/curriculum/key-stage-1"
      },
      {
        icon: Users,
        label: "Blynyddoedd 4, 5 a 6",
        title: "Cam Cynnydd 3",
        summary: "Meithrin dysgu annibynnol a gwybodaeth bwnc ddyfnach i baratoi disgyblion ar gyfer eu trosglwyddiad i'r ysgol uwchradd.",
        href: "/curriculum/key-stage-2"
      },
      {
        icon: Leaf,
        label: "Teithiau, clybiau a dysgu awyr agored",
        title: "Y Tu Hwnt i'r Ystafell Ddosbarth",
        summary: "Cyfoethogi'r cwricwlwm drwy ddysgu yn yr awyr agored, teithiau addysgol, ac amrywiaeth eang o glybiau ar ôl ysgol.",
        href: "/curriculum/beyond-the-classroom"
      }
    ],
    details: "Beth rydym yn ei ddysgu",
    learnMoreTitle: "Dysgu Mwy",
    learnMoreBody: "Oes gennych chi gwestiwn am ein cwricwlwm? Byddem wrth ein bodd yn clywed gennych. Cysylltwch â swyddfa'r ysgol i siarad ag aelod o staff.",
    contactUs: "Cysylltu â Ni"
  }
};


export default function CurriculumPage() {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <div className="bg-background">
      <PageHeader title={t.title} intro={t.intro} />

      <div className="container mx-auto max-w-5xl px-6 pb-20 pt-4 md:px-8">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {t.stages.map((stage, index) => {
            const tone = STAGE_TONES[index];
            return (
              <li key={stage.href} className="h-full">
                <Tile tone={tone} as={Link} hover href={stage.href} className="h-full">
                  <TileLabel tone={tone} icon={stage.icon}>{stage.label}</TileLabel>
                  <TileTitle as="h2" className="text-2xl">{stage.title}</TileTitle>
                  <p className="mt-2 text-sm text-muted-foreground">{stage.summary}</p>
                  <CardCue label={t.details} className={TONES[tone].cue} />
                </Tile>
              </li>
            );
          })}
        </ul>

        <div className="mt-16 text-center">
          <h2 className="font-headline text-2xl font-bold md:text-3xl">{t.learnMoreTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t.learnMoreBody}</p>
          <Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90">
            <Mail className="h-4 w-4" />{t.contactUs}
          </Link>
        </div>
      </div>
    </div>
  );
}
