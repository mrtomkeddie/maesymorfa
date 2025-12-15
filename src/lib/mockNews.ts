
export type Attachment = {
    name: string;
    url: string;
    type: 'pdf' | 'image';
}

export type NewsPost = {
    id: string;
    slug: string;
    title_en: string;
    title_cy: string;
    body_en: string;
    body_cy: string;
    date: string; // ISO 8601 format
    category: 'Urgent' | 'Event' | 'General';
    attachments: Attachment[]; // This can be deprecated in favor of attachmentUrl
    attachmentUrl?: string;
    attachmentName?: string;
    image?: string; // New property
    isUrgent: boolean;
    published: boolean;
    createdBy: string;
    lastEdited: string;
};

export type UrgentNewsPost = NewsPost & { isUrgent: true };


const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
}

const newsData_en = [
    {
        title_en: "School Closed due to Heavy Snow",
        body_en: "<p>Due to the adverse weather conditions and heavy snowfall overnight, Maes Y Morfa Primary School will be closed today, <strong>Friday, 12th January 2024</strong>. The safety of our pupils and staff is our utmost priority. We will provide updates on the school's reopening as soon as possible. Please check back for more information. Stay warm and safe.</p>",
        category: 'Urgent',
        isUrgent: true,
        image: "https://images.unsplash.com/photo-1547573854-ea8427f69447?q=80&w=2670&auto=format&fit=crop"
    },
    {
        title_en: "Annual Summer Fete - Save the Date!",
        body_en: "<p>Get ready for a day of fun, games, and community spirit! Our annual Summer Fete will take place on <strong>Saturday, 22nd June 2024</strong> from 12 PM to 4 PM on the school grounds. Expect bouncy castles, face painting, a bake sale, and much more. All proceeds will go towards new playground equipment. We look forward to seeing you all there!</p>",
        category: 'Event',
        isUrgent: false,
        image: "https://images.unsplash.com/photo-1533227297464-94a28cceb282?q=80&w=2670&auto=format&fit=crop"
    },
    {
        title_en: "Parent-Teacher Meeting Schedule Now Available",
        body_en: "<p>The schedule for the upcoming Parent-Teacher meetings is now available. Meetings will be held from <strong>Monday, 26th February to Friday, 1st March 2024</strong>. Please log in to the Parent Portal to book your preferred time slot. This is a valuable opportunity to discuss your child's progress with their teacher.</p>",
        category: 'General',
        isUrgent: false,
        image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2670&auto=format&fit=crop"
    },
    {
        title_en: "World Book Day Celebrations",
        body_en: "<p>On Thursday, 7th March, we will be celebrating World Book Day! Children are invited to come to school dressed as their favourite character from a book. We will have a special assembly, storytelling sessions, and a book swap. Let's celebrate the joy of reading together!</p>",
        category: 'Event',
        isUrgent: false,
        image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2670&auto=format&fit=crop"
    }
];

const newsData_cy = [
    {
        title_cy: "Ysgol ar Gau oherwydd Eira Trwm",
        body_cy: "<p>Oherwydd y tywydd garw a'r eira trwm dros nos, bydd Ysgol Gynradd Maes Y Morfa ar gau heddiw, <strong>dydd Gwener, 12fed Ionawr 2024</strong>. Mae diogelwch ein disgyblion a'n staff yn flaenoriaeth i ni. Byddwn yn darparu diweddariadau am ailagor yr ysgol cyn gynted â phosibl. Gwiriwch yn ôl am fwy o wybodaeth. Cadwch yn gynnes ac yn ddiogel.</p>"
    },
    {
        title_cy: "Ffair Haf Flynyddol - Cadwch y Dyddiad!",
        body_cy: "<p>Byddwch yn barod am ddiwrnod o hwyl, gemau, ac ysbryd cymunedol! Cynhelir ein Ffair Haf flynyddol ar <strong>ddydd Sadwrn, 22ain Mehefin 2024</strong> o 12 PM i 4 PM ar dir yr ysgol. Disgwyliwch gestyll bownsio, peintio wynebau, stondin gacennau, a llawer mwy. Bydd yr holl elw yn mynd tuag at offer newydd i'r iard chwarae. Edrychwn ymlaen at eich gweld chi yno!</p>"
    },
    {
        title_cy: "Amserlen Cyfarfodydd Rhieni ac Athrawon Nawr ar Gael",
        body_cy: "<p>Mae'r amserlen ar gyfer y cyfarfodydd Rhieni ac Athrawon sydd i ddod nawr ar gael. Cynhelir cyfarfodydd o <strong>ddydd Llun, 26ain Chwefror i ddydd Gwener, 1af Mawrth 2024</strong>. Mewngofnodwch i'r Porth Rieni i archebu eich slot amser dewisol. Mae hwn yn gyfle gwerthfawr i drafod cynnydd eich plentyn gyda'u hathro.</p>"
    },
    {
        title_cy: "Dathliadau Diwrnod y Llyfr",
        body_cy: "<p>Ar ddydd Iau, 7fed Mawrth, byddwn yn dathlu Diwrnod y Llyfr! Gwahoddir plant i ddod i'r ysgol wedi'u gwisgo fel eu hoff gymeriad o lyfr. Bydd gennym wasanaeth arbennig, sesiynau adrodd straeon, a chyfnewid llyfrau. Dewch i ni ddathlu llawenydd darllen gyda'n gilydd!</p>"
    }
];


export const news: NewsPost[] = newsData_en.map((post_en, index) => {
    const post_cy = newsData_cy[index];
    const date = new Date();
    date.setDate(date.getDate() - (index * 10 + 5)); // Stagger dates

    return {
        id: `news_${index + 1}`,
        slug: generateSlug(post_en.title_en),
        title_en: post_en.title_en,
        title_cy: post_cy.title_cy,
        body_en: post_en.body_en,
        body_cy: post_cy.body_cy,
        date: date.toISOString(),
        category: post_en.category as 'Urgent' | 'Event' | 'General',
        isUrgent: post_en.isUrgent,
        image: post_en.image,
        attachments: [],
        published: true,
        createdBy: 'admin@morfa.sch.uk',
        lastEdited: new Date().toISOString()
    };
});
