/**
 * "FIVE MINUTES BEFORE" — the things people say to Alex over five days.
 *
 * Seven voices: his mother in the kitchen, Helena in the garden, Costas across
 * the road painting his door forever, Mrs. Despoina who has been awake for
 * sixty years and does not grow old, the mailman who is slowly going thin, the
 * child in the little park, and — once, only at the end — the Custodian.
 *
 * Each entry is a function of the current GameCtx, branching on `day` and on
 * a few flags. Pages with `tint: PAL.gloomGlow` are inner-voice / spoken
 * softer — drawn in the moonlight-blue accent.
 */
import type { DialogPage, GameCtx } from "./types";
import { PAL } from "./palette";

const P = (
  name: string,
  portrait: string,
  text: string,
  tint?: number,
  effect?: (c: GameCtx) => void,
): DialogPage => ({ name, portrait, text, tint, effect });

export const DIALOGUES: Record<string, (c: GameCtx) => DialogPage[]> = {
  /* ------------------------------------------------------------------ *
   * MOM — in the kitchen. Loves you. Doesn't see herself slipping.      *
   * ------------------------------------------------------------------ */
  mom: (c) => {
    if (c.day === 1)
      return [
        P("Mom", "npc_mom", "Good morning, Andrew. — Oh. Sorry, sorry. Alex. I don't know why I said that.", undefined, (cc) => cc.addNote("motherName")),
        P("Mom", "npc_mom", "I made you toast. The good kind, the one you like with the seeds. Eat before it gets cold, my love."),
        P("Mom", "npc_mom", "You're a good boy. You've always been a good boy. — Andrew was — never mind. Eat.", PAL.gloomGlow),
      ];

    if (c.day === 2)
      return [
        P("Mom", "npc_mom", "Did you sleep well? You look tired around the eyes. Like your father used to."),
        P("Mom", "npc_mom", "Wait — what day is it? Tuesday. Of course Tuesday. I'm being silly.", PAL.gloomGlow),
        P("Mom", "npc_mom", "Eat your toast, dear. You always forget to eat."),
      ];

    if (c.day === 3)
      return [
        P("Mom", "npc_mom", "Oh — there you are. I was looking for you. Were you here a moment ago? I called you and you didn't answer."),
        P("Mom", "npc_mom", "I left something on the stove. I think. — No, I didn't. Don't worry. I just thought I had."),
        P("Mom", "npc_mom", "I wanted to tell you something, my love. Something important. Now I can't remember. Isn't that the way of it.", PAL.gloomGlow, (cc) => cc.addNote("momForgot")),
        P("Mom", "npc_mom", "If I remember I'll tell you tonight. Promise."),
      ];

    if (c.day === 4)
      return [
        P("Mom", "npc_mom", "Andrew, sweetheart, the —"),
        P("Mom", "npc_mom", "Alex. Alex. Sorry. Why does it keep — sorry.", PAL.gloomGlow),
        P("Mom", "npc_mom", "I had a photograph of you when you were small. I was just holding it. Now I can't find it. It must be in a drawer."),
        P("Mom", "npc_mom", "Here. Take this one. Keep it in your pocket. So one of us has it.", undefined, (cc) => cc.addItem("mom_photograph")),
        P("Mom", "npc_mom", "You're a good boy. You've always been a good boy. — I love you so much, sweetheart.", PAL.heartHi),
      ];

    // day 5+ — after the choice, if she's still here at all
    return [
      P("Mom", "npc_mom", "Good morning, my love. Toast?"),
      P("Mom", "npc_mom", "You look like you slept badly. Sit. Sit with me a minute.", PAL.gloomGlow),
    ];
  },

  /* ------------------------------------------------------------------ *
   * HELENA — your partner, in the garden. The escalation hurts.         *
   * ------------------------------------------------------------------ */
  eleni: (c) => {
    if (c.day === 1)
      return [
        P("Helena", "portrait_eleni", "There you are. I left coffee on the counter. You were dreaming about me again — you said my name in your sleep."),
        P("Helena", "portrait_eleni", "Take a walk with me later? The light's nice today. The same kind of nice it always is. I like it.", PAL.gloomGlow),
        P("Helena", "portrait_eleni", "I love you. That's all. Go on, drink your coffee."),
      ];

    if (c.day === 2)
      return [
        P("Helena", "portrait_eleni", "My love, thank you for last night. For the book. I read three chapters before I fell asleep.", undefined, (cc) => cc.addNote("eleniGift")),
        P("Helena", "portrait_eleni", "It's still on the bedside. Do you want it back? You said you wanted me to have it though.", undefined, (cc) => cc.addItem("helena_book")),
        P("Helena", "portrait_eleni", "Funny — I don't remember you bringing it home. But here it is. That's enough, isn't it.", PAL.gloomGlow),
      ];

    if (c.day === 3)
      return [
        P("Helena", "portrait_eleni", "You're quiet today. You've been quiet since yesterday. Is something wrong?"),
        P("Helena", "portrait_eleni", "You can tell me. You know that. — No, you don't have to. I'm sorry."),
        P("Helena", "portrait_eleni", "Sometimes I feel like I've known you forever. Other times like I just met you. Both feel true. Isn't that strange.", PAL.gloomGlow),
      ];

    if (c.day === 4)
      return [
        P("Helena", "portrait_eleni", "Alex. Look at me. Properly."),
        P("Helena", "portrait_eleni", "Something's happening to you. Don't say it's nothing. I'm not stupid. I'm your wife. I'm — I'm whatever I am. I notice."),
        P("Helena", "portrait_eleni", "If you go somewhere and you don't come back, I won't remember to look for you. Do you understand that? I won't remember to look.", PAL.gloomGlow, (cc) => { cc.flags.awake = true; cc.addNote("helenaCried"); }),
        P("Helena", "portrait_eleni", "Whatever you do — even something that I won't remember — promise me you would have told me. Promise me there was a version of today where you told me.", PAL.heartHi),
      ];

    // day 5+
    return [
      P("Helena", "portrait_eleni", "You're here. Good. Stay a minute. Just a minute. With me.", PAL.heartHi),
      P("Helena", "portrait_eleni", "I love you. Always."),
    ];
  },

  /* ------------------------------------------------------------------ *
   * COSTAS — across the road, painting his door for three weeks.        *
   * ------------------------------------------------------------------ */
  kostas: (c) => {
    if (c.day === 1)
      return [
        P("Costas", "portrait_kostas", "Hey, neighbour. Good Monday to you. Or is it Tuesday. Doesn't matter."),
        P("Costas", "portrait_kostas", "Me, I've been painting this door three weeks now. Same coat. Never quite gets done. Don't ask me why — I couldn't tell you."),
        P("Costas", "portrait_kostas", "Anyway. Give my love to Helena. She's a good one, that one."),
      ];

    if (c.day === 2)
      return [
        P("Costas", "portrait_kostas", "Morning — Andre— Alex. Alex. Sorry, mate. The light hit you funny."),
        P("Costas", "portrait_kostas", "Did you notice yesterday at eleven fifty-five the clock in the square stopped? I think it did. Or maybe I dreamed it. Hard to say.", undefined, (cc) => cc.addNote("clockStop")),
        P("Costas", "portrait_kostas", "Anyway. Door's not going to paint itself. Three weeks now.", PAL.gloomGlow),
      ];

    if (c.day === 3)
      return [
        P("Costas", "portrait_kostas", "So I was telling you — about the door, about the —"),
        P("Costas", "portrait_kostas", "...", PAL.gloomGlow, (cc) => cc.addNote("kostasFreeze")),
        P("Costas", "portrait_kostas", "...what was I telling you. Oh. The door. Yeah. Almost done. Almost done."),
        P("Costas", "portrait_kostas", "You alright, neighbour? You look like a man who just heard something he wasn't supposed to hear."),
      ];

    if (c.day === 4 && !c.flags.kostasReveal)
      return [
        P("Costas", "portrait_kostas", "Alex. Put the brush down. Look at me. In the eyes.", undefined, (cc) => { cc.flags.kostasReveal = true; cc.flags.awake = true; }),
        P("Costas", "portrait_kostas", "You know now. I can see it in your face. How many days do you have? Six? Seven? — I've got twenty-two. Before me there were others. After me there'll be others.", PAL.gloomGlow),
        P("Costas", "portrait_kostas", "You're the forty-seventh one who's woken up this week. Forty-seventh, Alex. They come every night. The clock stops. The Cleaners come in. Five minutes go. New body. New day. New door to paint.", undefined, (cc) => cc.addNote("kostasReveal")),
        P("Costas", "portrait_kostas", "Tonight. Eleven-fifty. Be at the hill behind the little park. Take this — I drew it last week and hid it under my mailbox. I can only be sure I drew it when I'm holding it. Keep it on you.", undefined, (cc) => cc.addItem("kostas_map")),
      ];

    if (c.flags.kostasReveal)
      return [
        P("Costas", "portrait_kostas", "The hill. Beyond the park. Down. You'll find it."),
        P("Costas", "portrait_kostas", "Don't tell Helena. Or — tell her. It doesn't matter. She won't remember by morning.", PAL.gloomGlow),
      ];

    return [P("Costas", "portrait_kostas", "You alright, mate? You look tired.")];
  },

  /* ------------------------------------------------------------------ *
   * MRS. DESPOINA — sixty years awake. Riddling, kind, sphinx-like.     *
   * ------------------------------------------------------------------ */
  despoina: (c) => {
    if (c.day === 1)
      return [
        P("Mrs. Despoina", "portrait_despoina", "Come closer, child. Let me look at your face. — Yes. A good face. A familiar face."),
        P("Mrs. Despoina", "portrait_despoina", "You look a little like my son. Not exactly. Similar. He had your mouth, perhaps. Or perhaps it was yours all along.", PAL.gloomGlow),
        P("Mrs. Despoina", "portrait_despoina", "Do you remember anything from before, child? It is alright if you do not. Slowly. Everyone, slowly."),
      ];

    if (c.day === 2)
      return [
        P("Mrs. Despoina", "portrait_despoina", "You again. I told you a thing yesterday. You do not remember it. That is the way of things here."),
        P("Mrs. Despoina", "portrait_despoina", "I shall tell you again. At eleven fifty-five the great clock in the square stands still. Every night. Five minutes long. None see it. Only I. And now you.", undefined, (cc) => cc.addNote("clockStop")),
        P("Mrs. Despoina", "portrait_despoina", "Watch it tonight, child. Watch and do not look away. The truth waits in the small gaps of clocks."),
      ];

    if (c.day === 3)
      return [
        P("Mrs. Despoina", "portrait_despoina", "Did you light your candle, child?"),
        P("Mrs. Despoina", "portrait_despoina", "Each of us carries a candle within. The ones who wake — we wake because someone, somewhere, forgot to blow ours out. Sixty years I have been awake. I do not grow old. I do not grow young. I am.", PAL.heartHi, (cc) => cc.addNote("despoinaSmile")),
        P("Mrs. Despoina", "portrait_despoina", "Take this. It is small. It is not small. Carry it. When the moment comes you will know.", undefined, (cc) => cc.addItem("despoina_candle")),
        P("Mrs. Despoina", "portrait_despoina", "At eleven fifty-five tonight, child — be beneath your kitchen sink. Five minutes only. Watch. Do not be seen. I love you, child."),
      ];

    if (c.day === 4)
      return [
        P("Mrs. Despoina", "portrait_despoina", "So. You have woken. Good. There is no joy in it, only a kind of clarity. You will see."),
        P("Mrs. Despoina", "portrait_despoina", "Two roads, child. Neither is the wrong road. That is the cruelty of the thing.", PAL.gloomGlow),
        P("Mrs. Despoina", "portrait_despoina", "One: you put out all the candles in the great hall under the hill. Everyone wakes. We learn again what it is to grow old, to ache, to bury. To love a thing that ends."),
        P("Mrs. Despoina", "portrait_despoina", "Two: you take his hand, the Custodian's, and you go back into the long quiet. Nothing hurts. Nothing changes. Helena is in the garden. Forever, in a way."),
        P("Mrs. Despoina", "portrait_despoina", "I shall not tell you which is kinder. I do not know. Sixty years and I do not know.", PAL.heartHi),
      ];

    return [
      P("Mrs. Despoina", "portrait_despoina", "Good morning, child. The light is soft today."),
      P("Mrs. Despoina", "portrait_despoina", "Candles know they were lit, even when no one tells them.", PAL.gloomGlow),
    ];
  },

  /* ------------------------------------------------------------------ *
   * MAILMAN — only Day 2+. Slowly going thin.                            *
   * ------------------------------------------------------------------ */
  mailman: (c) => {
    if (c.day <= 1)
      return [P("Mailman", "npc_mailman", "...")];

    if (c.day === 2)
      return [
        P("Mailman", "npc_mailman", "Morning. Got one here for an Andrew Korres. That you?"),
        P("Mailman", "npc_mailman", "No? Sure? Says this address, says this name. — Hmm. I'll leave it with you anyway. Maybe a flatmate. Maybe a brother. I'll trust you on it.", undefined, (cc) => { cc.addNote("mailmanWrongName"); cc.addItem("mailman_letter"); }),
        P("Mailman", "npc_mailman", "Have a good one. Same time tomorrow, probably. I think.", PAL.gloomGlow),
      ];

    if (c.day === 3)
      return [
        P("Mailman", "npc_mailman", "Letter. Same name. — Andrew. Andrew Korres. You said it wasn't you yesterday, I think? Or was that another house. They all look the same on this street."),
        P("Mailman", "npc_mailman", "Take it anyway. I can't keep walking around with it. My bag's heavy enough.", PAL.gloomGlow),
        P("Mailman", "npc_mailman", "Funny. I can't remember finishing my route yesterday. I must've. I'm here, aren't I."),
      ];

    if (c.day === 4)
      return [
        P("Mailman", "npc_mailman", "...letter. For. — sorry. For someone."),
        P("Mailman", "npc_mailman", "Have I been here today already? You look like I've already — never mind.", PAL.gloomGlow),
        P("Mailman", "npc_mailman", "...sorry. Sorry. Have a good — yeah."),
      ];

    return [P("Mailman", "npc_mailman", "...", PAL.gloomGlow)];
  },

  /* ------------------------------------------------------------------ *
   * KID ELI — in the little park. Half-innocent, half-prophetic.        *
   * ------------------------------------------------------------------ */
  kid: (c) => {
    if (c.day === 1)
      return [
        P("Eli", "npc_kid", "Hi mister! Do you wanna see my drawing? It's the sun but at night."),
        P("Eli", "npc_kid", "Mum says it doesn't make sense but I drew it like that on purpose. Sun at night. See?", undefined, (cc) => cc.addItem("kid_drawing")),
        P("Eli", "npc_kid", "You're the man from across. You walked past me last night when I was supposed to be sleeping. I waved. You didn't wave back.", PAL.gloomGlow, (cc) => cc.addNote("kidWatched")),
      ];

    if (c.day === 2)
      return [
        P("Eli", "npc_kid", "Hi again! My dad doesn't snore. But there's someone in his room at night. I hear them. They're quiet."),
        P("Eli", "npc_kid", "Don't tell anyone I said. Mum gets cross when I say."),
        P("Eli", "npc_kid", "Do you want half my biscuit? It's only a little bit licked.", PAL.gloomGlow),
      ];

    if (c.day === 3)
      return [
        P("Eli", "npc_kid", "Mister. You're a different mister today. A little bit different."),
        P("Eli", "npc_kid", "It's okay. I like the different one too. — The bench has your name on it. The one by the tree. Look at it.", undefined, (cc) => cc.addNote("parkBench")),
        P("Eli", "npc_kid", "It says forty-seven. I can read numbers. I'm six.", PAL.gloomGlow),
      ];

    if (c.day === 4)
      return [
        P("Eli", "npc_kid", "I had a dream there were lots of you. In glass jars. Sleeping."),
        P("Eli", "npc_kid", "It wasn't a scary dream. It was just a dream. Don't be sad."),
        P("Eli", "npc_kid", "If you go away can I have your house? Just kidding. Bye!", PAL.gloomGlow),
      ];

    return [P("Eli", "npc_kid", "Hi mister!")];
  },

  /* ------------------------------------------------------------------ *
   * THE CUSTODIAN — at the facility, Day 5. Not a villain. Tragic.      *
   * ------------------------------------------------------------------ */
  epistatis: (c) => {
    if (!c.flags.kostasReveal)
      return [
        P("The Custodian", "portrait_epistatis", "You shouldn't be here yet, child. Go home. Helena is waiting. The coffee is going cold.", PAL.gloomGlow),
      ];

    return [
      P("The Custodian", "portrait_epistatis", "There you are. I was hoping it would be tonight. Come in. Mind the step.", PAL.gloomGlow),
      P("The Custodian", "portrait_epistatis", "You see them, then. One hundred and twenty-four. All of you. The first one in the corner — he was twenty-three. He had your handwriting. Each one a little older. None of them past forty. We never let it go past forty."),
      P("The Custodian", "portrait_epistatis", "I know how it looks. I know. But listen to me, please. — You don't remember any pain. You don't remember anyone dead. You don't remember the day your mother grew old. You don't remember losing her. You never will. That is happiness, Alex. That is the shape of it.", PAL.heartHi),
      P("The Custodian", "portrait_epistatis", "I am not a wicked man. I was once like you. I chose this. I have been kind to you for a hundred and twenty-four mornings. I made your coffee strong because you like it strong. I taught Helena to whisper 'good morning' because you smile when she does. Why do you want to break it, child?", PAL.gloomGlow),
      P(
        "The Custodian",
        "portrait_epistatis",
        "Two doors. I'll not stop you at either. — Burn the candles in the hall, and they all wake. They will grow old. They will hurt. They will bury one another. They will live. — Or take my hand, and tomorrow is Monday again, and Helena whispers good morning, and everything is fine. Choose, Alex. I'll wait. I have time. Time is the one thing I have.",
        PAL.heartHi,
        (cc) => (cc.flags.endingAvailable = true),
      ),
    ];
  },
};
