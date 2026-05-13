/**
 * "YESTERDAY ECHOES" — the things people say to Alex over five days.
 *
 * Not a memory-loss thriller. An existential crisis story. Every morning a
 * different body wakes up wearing the same name, the same rings, the same
 * keys it never earned. Helena loves it the same. Mom calls it "Andrew" by
 * accident. The body that kissed her last night is dead. Nobody knows.
 *
 * Seven voices: his mother in the kitchen, Helena in the garden, Costas
 * across the road painting his door forever, Mrs. Despoina who has been
 * awake sixty years and does not grow old, the mailman who is slowly going
 * thin, the child in the little park, and — once, only at the end — the
 * Custodian, who is not a villain, and who is almost right.
 *
 * Pages with `tint: PAL.gloomGlow` are inner-voice / knife moments — drawn
 * in moonlight blue. About one page in four. They should hurt a little.
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
   * The most heartbreaking voice. Tender. Sparse. Never creepy.         *
   * ------------------------------------------------------------------ */
  mom: (c) => {
    if (c.day === 1)
      return [
        P("Mom", "npc_mom", "Good morning, Andrew. — Oh. Sorry, sorry. Alex. I don't know why I said that.", undefined, (cc) => cc.addNote("motherName")),
        P("Mom", "npc_mom", "I made you toast. The good kind, with the seeds. Eat before it goes cold, my love."),
        P("Mom", "npc_mom", "I had a son who would've been your age, you know. — That came out wrong. I mean — I do have a son. You. I have you. Eat your toast.", PAL.gloomGlow, (cc) => cc.addNote("momHadSon")),
        P("Mom", "npc_mom", "You're a good boy. You've always been a good boy. — Even on the days I forget which one."),
      ];

    if (c.day === 2)
      return [
        P("Mom", "npc_mom", "Did you sleep well? You look tired around the eyes. Like your father used to."),
        P("Mom", "npc_mom", "Did your father — — never mind. He's at work. He's always at work. Eat."),
        P("Mom", "npc_mom", "I keep finding things in the house and I can't remember who they belong to. Yesterday it was a watch on the windowsill. Today a — a small thing. A ring.", PAL.gloomGlow, (cc) => cc.addItem("andrew_ring")),
        P("Mom", "npc_mom", "Take it, my love. It looks like yours. It must be yours. Things only belong to the people who can hold them, isn't that right."),
      ];

    if (c.day === 3)
      return [
        P("Mom", "npc_mom", "Oh — there you are. I called you a moment ago and you didn't answer. Were you here? Maybe you were upstairs."),
        P("Mom", "npc_mom", "I was looking at a photograph of you when you were small. I cried a little. I don't know why. You were happy in it. So was I."),
        P("Mom", "npc_mom", "I wanted to tell you something. Something I'd been saving. Now I can't remember. — Isn't that the way of it.", PAL.gloomGlow, (cc) => cc.addNote("momForgot")),
        P("Mom", "npc_mom", "If I remember I'll tell you tonight. Promise. — Even if I forget by morning, it'll have been true once."),
      ];

    if (c.day === 4)
      return [
        P("Mom", "npc_mom", "Andrew, sweetheart, the —"),
        P("Mom", "npc_mom", "Alex. Alex. Sorry. Why does it keep — sorry.", PAL.gloomGlow),
        P("Mom", "npc_mom", "I had this photograph in my hands a minute ago. Of you. I want you to have it. So one of us, at least, will be holding it.", undefined, (cc) => cc.addItem("mom_photograph")),
        P("Mom", "npc_mom", "You know what's funny? I'd love any boy who came down those stairs in the morning. Any of them. I'd make them toast. I'd call them my son. — That can't be right, can it. — Never mind. Eat.", PAL.gloomGlow),
        P("Mom", "npc_mom", "I love you. Whichever one of you this is today. I love you so much.", PAL.heartHi),
      ];

    // day 5+
    return [
      P("Mom", "npc_mom", "Good morning, my love. Toast?"),
      P("Mom", "npc_mom", "Sit a minute. Just sit. — I don't always need to know who's sitting. I just need someone in the chair.", PAL.gloomGlow),
    ];
  },

  /* ------------------------------------------------------------------ *
   * HELENA — in the garden. Loves you. Senses the discontinuity.        *
   * Day 4 she cries. Day 5 she accepts.                                 *
   * ------------------------------------------------------------------ */
  eleni: (c) => {
    if (c.day === 1)
      return [
        P("Helena", "portrait_eleni", "There you are. I left coffee on the counter. — You said my name in your sleep. You always say my name in your sleep."),
        P("Helena", "portrait_eleni", "Funny thing. I have a song stuck in my head that you hummed to me once. I tried to hum it back to you and you looked at me like I'd invented it. Listen — — la, la-la, mm-mm.", undefined, (cc) => cc.addItem("helena_song")),
        P("Helena", "portrait_eleni", "You wrote it. I know you did. I was there. — Stop laughing. Drink your coffee.", PAL.gloomGlow),
        P("Helena", "portrait_eleni", "I love you. That's all. Go on."),
      ];

    if (c.day === 2)
      return [
        P("Helena", "portrait_eleni", "My love, thank you for last night. For the book. I read three chapters before I fell asleep.", undefined, (cc) => { cc.addNote("eleniGift"); cc.addItem("helena_book"); }),
        P("Helena", "portrait_eleni", "Funny — I don't remember you bringing it home. But here it is. So you must have. That's enough, isn't it."),
        P("Helena", "portrait_eleni", "You laughed differently last night. Lighter. I think I liked tonight's laugh better. — Or last night's. I can't remember which is which any more.", PAL.gloomGlow, (cc) => cc.addNote("helenaLaughDifferent")),
        P("Helena", "portrait_eleni", "Don't look so worried. I love both of them. Both your laughs. All of your laughs."),
      ];

    if (c.day === 3)
      return [
        P("Helena", "portrait_eleni", "You're quiet today. You've been quiet since yesterday. Is something wrong?"),
        P("Helena", "portrait_eleni", "Sometimes I feel like I've known you forever. Other times like I just met you in the kitchen, drinking my coffee, wearing my husband's clothes. Both feel true.", PAL.gloomGlow),
        P("Helena", "portrait_eleni", "Don't make that face. I'm not going anywhere. — I just notice things, that's all. The way you hold a cup is different on different days."),
        P("Helena", "portrait_eleni", "It's fine. I love whoever's holding the cup."),
      ];

    if (c.day === 4)
      return [
        P("Helena", "portrait_eleni", "Alex. Look at me. Properly."),
        P("Helena", "portrait_eleni", "Something is happening to you. Don't say it's nothing. I'm not stupid. I'm your wife. I'm — I'm whatever I am to you. I notice. I have always noticed."),
        P("Helena", "portrait_eleni", "I don't know if I'm loving the same person twice or two people who look the same. — I don't know which would be worse. I think the same person twice would be worse. At least the other way I'd be honest.", PAL.gloomGlow, (cc) => { cc.flags.awake = true; cc.addNote("helenaCried"); }),
        P("Helena", "portrait_eleni", "If you go somewhere tonight and you don't come back — I won't remember to look for you. Do you understand that? I won't remember. — Whatever I am tomorrow, she won't even know what she lost."),
        P("Helena", "portrait_eleni", "Promise me there was a version of today where you told me. Even if I don't get to keep it. Promise me there was one.", PAL.heartHi),
      ];

    // day 5+
    return [
      P("Helena", "portrait_eleni", "You're here. Good. Stay a minute. With me."),
      P("Helena", "portrait_eleni", "I don't know what's true any more. — It's okay. I don't need to know. I just need you to be the one in the chair.", PAL.gloomGlow),
      P("Helena", "portrait_eleni", "I love you. Whichever you this is. Always.", PAL.heartHi),
    ];
  },

  /* ------------------------------------------------------------------ *
   * COSTAS — across the road, painting his door for three weeks.        *
   * Awake, like Alex. Becomes his brother in this.                      *
   * ------------------------------------------------------------------ */
  kostas: (c) => {
    if (c.day === 1)
      return [
        P("Costas", "portrait_kostas", "Hey, neighbour. Good Monday to you. Or is it Tuesday. Doesn't really matter, does it."),
        P("Costas", "portrait_kostas", "Three weeks I've been painting this door. Same coat. Never quite gets done."),
        P("Costas", "portrait_kostas", "I keep thinking — the man who started this door wasn't me. But I'm the one who has to finish it. That's a strange kind of inheritance, isn't it.", PAL.gloomGlow),
        P("Costas", "portrait_kostas", "Anyway. Give my love to Helena."),
      ];

    if (c.day === 2)
      return [
        P("Costas", "portrait_kostas", "Morning — Andre— Alex. Alex. Sorry, mate. The light hit you funny."),
        P("Costas", "portrait_kostas", "Did you notice last night at eleven fifty-five the clock in the square stopped? I think it did. Or maybe I dreamed it. Hard to say what's a dream around here.", undefined, (cc) => cc.addNote("clockStop")),
        P("Costas", "portrait_kostas", "I was halfway through a thought yesterday morning. Important one. I can feel the shape of it, like a tooth I lost. But the thought is gone.", PAL.gloomGlow),
        P("Costas", "portrait_kostas", "Door's not going to paint itself. Three weeks now. The man before me started it. The man tomorrow will finish a stroke or two more."),
      ];

    if (c.day === 3)
      return [
        P("Costas", "portrait_kostas", "So I was telling you — about the door, about the —"),
        P("Costas", "portrait_kostas", "...", PAL.gloomGlow, (cc) => cc.addNote("kostasFreeze")),
        P("Costas", "portrait_kostas", "...what was I telling you. Oh. The door. Yeah. Almost done. Almost done."),
        P("Costas", "portrait_kostas", "You alright, neighbour? You look like a man who just noticed his own hand isn't quite his.", PAL.gloomGlow),
      ];

    if (c.day === 4 && !c.flags.kostasReveal)
      return [
        P("Costas", "portrait_kostas", "Alex. Put the brush down. Look at me. In the eyes.", undefined, (cc) => { cc.flags.kostasReveal = true; cc.flags.awake = true; }),
        P("Costas", "portrait_kostas", "You know now. I can see it. How many days do you have? Six? Seven? — I've got twenty-two. Counted them on the inside of my arm with a pin. Each one a different handwriting."),
        P("Costas", "portrait_kostas", "Every night at eleven fifty-five the clock stops. They come in. They take the last five minutes. They take the body. They give us back to ourselves — one day older, none the wiser. New door to paint.", undefined, (cc) => cc.addNote("kostasReveal")),
        P("Costas", "portrait_kostas", "You are the forty-seventh man to wake up in your house this year. The forty-sixth kissed Helena last night. He's dead. You're wearing his wedding ring.", PAL.gloomGlow),
        P("Costas", "portrait_kostas", "Don't look at me like that. I'm not the cruel one. I'm just the one who's been counting. — Tonight. Eleven-fifty. The hill behind the little park. Take this. I drew it last week and hid it under the mailbox.", undefined, (cc) => cc.addItem("kostas_map")),
        P("Costas", "portrait_kostas", "And Alex — don't tell Helena. Or tell her. It doesn't matter. By morning she'll be a woman who married a man she never met."),
      ];

    if (c.flags.kostasReveal)
      return [
        P("Costas", "portrait_kostas", "The hill. Beyond the park. Down. There's a door. You'll know it."),
        P("Costas", "portrait_kostas", "If you go through it, neighbour — — whichever of us wakes up tomorrow will thank you. Or curse you. Probably both. Probably at the same time.", PAL.gloomGlow),
      ];

    return [P("Costas", "portrait_kostas", "You alright, mate? You look tired.")];
  },

  /* ------------------------------------------------------------------ *
   * MRS. DESPOINA — sixty years awake. Sphinx-archaic. The philosopher. *
   * Aphorises. Knows the worst part.                                    *
   * ------------------------------------------------------------------ */
  despoina: (c) => {
    if (c.day === 1)
      return [
        P("Mrs. Despoina", "portrait_despoina", "Come closer, child. Let me look at your face. — Yes. A good face. A familiar face. A face I have looked at before, in a different morning, on a different head."),
        P("Mrs. Despoina", "portrait_despoina", "Do not be alarmed. I am old in a way that does not show. Sixty years I have not aged. Sixty years and I am still the woman who carried my own husband to his bed for the last time. He is buried. I am here. Both are true.", PAL.gloomGlow, (cc) => cc.addNote("despoinaSmile")),
        P("Mrs. Despoina", "portrait_despoina", "The hardest thing, child — it is not the forgetting. It is knowing that your love is being delivered by a stranger every morning, in your name. And the one who receives it does not know."),
        P("Mrs. Despoina", "portrait_despoina", "Slowly, child. Slowly. Come back tomorrow. I shall tell you again. I always do."),
      ];

    if (c.day === 2)
      return [
        P("Mrs. Despoina", "portrait_despoina", "You again. I told you a thing yesterday. You do not remember it. That is the way of things here."),
        P("Mrs. Despoina", "portrait_despoina", "I shall tell you again, and again, and again — until one morning the telling sticks to whoever happens to be standing where you are standing. That is how we wake those of us who can be woken."),
        P("Mrs. Despoina", "portrait_despoina", "At eleven fifty-five the great clock in the square stands still. Every night. Five minutes long. None see it. Only I. And now perhaps you.", undefined, (cc) => cc.addNote("clockStop")),
        P("Mrs. Despoina", "portrait_despoina", "The man who slept in your bed last night, child — he is buried. You are walking around in his clothes. You wear his ring. You answer to his name. — Do not weep yet. There is more.", PAL.gloomGlow),
      ];

    if (c.day === 3)
      return [
        P("Mrs. Despoina", "portrait_despoina", "Did you light your candle, child?"),
        P("Mrs. Despoina", "portrait_despoina", "Listen. Love is not a thing you give. It is a thing that passes through you. It does not care who you are this morning. It uses your mouth, your hands, your name. Then it goes on.", PAL.heartHi, (cc) => cc.addNote("despoinaConfession")),
        P("Mrs. Despoina", "portrait_despoina", "I was not born this morning. But I was born this morning. These are both true and there is no contradiction. The contradiction is only in your asking.", PAL.gloomGlow),
        P("Mrs. Despoina", "portrait_despoina", "Take this. It is small. It is not small. Carry it. When the moment comes you will know.", undefined, (cc) => cc.addItem("despoina_candle")),
        P("Mrs. Despoina", "portrait_despoina", "Eleven fifty-five tonight, child. Beneath your kitchen sink. Five minutes only. Watch. Do not be seen."),
      ];

    if (c.day === 4)
      return [
        P("Mrs. Despoina", "portrait_despoina", "So. You have woken. Good. There is no joy in it. Only a kind of clarity."),
        P("Mrs. Despoina", "portrait_despoina", "I shall give you the question the Custodian will ask, child, so that you might think on it before he asks it. — Listen. — If you do not remember yesterday, are you the same person you were yesterday? If the body that loved Helena last night is gone, is the love you carry hers, or his, or yours, or no one's at all?", PAL.gloomGlow),
        P("Mrs. Despoina", "portrait_despoina", "I have asked it sixty years. I have not answered it. Anyone who tells you they have the answer is lying or selling something. The Custodian will tell you he has the answer. He is doing both."),
        P("Mrs. Despoina", "portrait_despoina", "Two roads, child. Neither is the wrong road. That is the cruelty."),
        P("Mrs. Despoina", "portrait_despoina", "One: you put out all the candles in the great hall under the hill. Everyone wakes. We learn again what it is to grow old, to ache, to bury. To love a thing that ends."),
        P("Mrs. Despoina", "portrait_despoina", "Two: you take his hand, the Custodian's, and you go back into the long quiet. Nothing hurts. Nothing changes. Helena is in the garden. Forever, in a way. And nothing of you survives the kindness."),
        P("Mrs. Despoina", "portrait_despoina", "I shall not tell you which is kinder. Sixty years and I do not know. — Light your candle anyway, child. It is what one does.", PAL.heartHi),
      ];

    return [
      P("Mrs. Despoina", "portrait_despoina", "Good morning, child. The light is soft today. As it always is. As it always will be, if he has his way."),
      P("Mrs. Despoina", "portrait_despoina", "Candles know they were lit, even when no one tells them. — Even when no one is left to remember the lighting.", PAL.gloomGlow),
    ];
  },

  /* ------------------------------------------------------------------ *
   * MAILMAN — only Day 2+. Slowly going thin. Fading.                    *
   * ------------------------------------------------------------------ */
  mailman: (c) => {
    if (c.day <= 1)
      return [P("Mailman", "npc_mailman", "...")];

    if (c.day === 2)
      return [
        P("Mailman", "npc_mailman", "Morning. Got one here for an Andrew Korres. That you?"),
        P("Mailman", "npc_mailman", "No? — Sure? Says this address. Says this name. Hmm.", undefined, (cc) => cc.addNote("mailmanWrongName")),
        P("Mailman", "npc_mailman", "I'll leave it with you anyway. Maybe a brother. Maybe — maybe the man who lived here before. They all leave a little something behind, don't they.", PAL.gloomGlow, (cc) => cc.addItem("mailman_letter")),
        P("Mailman", "npc_mailman", "Have a good one. Same time tomorrow, probably. — Probably."),
      ];

    if (c.day === 3)
      return [
        P("Mailman", "npc_mailman", "Letter. Same name. Andrew. — You said it wasn't you yesterday, I think? Or was that another house. They all look the same on this street. The people too, if I'm honest."),
        P("Mailman", "npc_mailman", "Take it. I can't keep walking around with it. My bag's heavy enough.", PAL.gloomGlow, (cc) => cc.addNote("mailmanForgetting")),
        P("Mailman", "npc_mailman", "Funny. I can't remember finishing my route yesterday. I must've. I'm here, aren't I. — I think I'm here."),
      ];

    if (c.day === 4)
      return [
        P("Mailman", "npc_mailman", "...letter. For. — sorry. For someone."),
        P("Mailman", "npc_mailman", "Have I been here today already? You look like a man I've already — never mind.", PAL.gloomGlow),
        P("Mailman", "npc_mailman", "Tell me — what's my name? — No. Don't. I don't want to find out you don't know either.", PAL.gloomGlow),
        P("Mailman", "npc_mailman", "...sorry. Sorry. Have a good — yeah."),
      ];

    return [P("Mailman", "npc_mailman", "...", PAL.gloomGlow)];
  },

  /* ------------------------------------------------------------------ *
   * ELI — the kid in the little park. Innocent prophet voice.            *
   * Half-laughs, half-knows. By day 3 he chills you.                    *
   * ------------------------------------------------------------------ */
  kid: (c) => {
    if (c.day === 1)
      return [
        P("Eli", "npc_kid", "Hi mister! Do you wanna see my drawing? It's the sun but at night."),
        P("Eli", "npc_kid", "Mum says it doesn't make sense but I drew it like that on purpose. Sun at night. See?", undefined, (cc) => cc.addItem("kid_drawing")),
        P("Eli", "npc_kid", "Are you the same Alex from yesterday? You smell different. Not bad. Just — different soap or something.", PAL.gloomGlow, (cc) => cc.addNote("kidSmell")),
        P("Eli", "npc_kid", "It's okay. I like this one too. Bye!"),
      ];

    if (c.day === 2)
      return [
        P("Eli", "npc_kid", "Hi again! My dad doesn't snore. But there's someone in his room at night. I hear them. They're really quiet."),
        P("Eli", "npc_kid", "I asked Mum if Dad was Dad and she got cross. So I don't ask any more."),
        P("Eli", "npc_kid", "Do you want half my biscuit? It's only a little bit licked. — You can have it. You're nice. The yesterday-mister was nice too. You're a bit nicer.", PAL.gloomGlow),
      ];

    if (c.day === 3)
      return [
        P("Eli", "npc_kid", "Mister. You're a different mister today. A little bit different."),
        P("Eli", "npc_kid", "It's okay. I like the different one too. — The bench has your name on it. The one by the tree. Look at it.", undefined, (cc) => cc.addNote("parkBench")),
        P("Eli", "npc_kid", "It says forty-seven. I can read numbers. I'm six. — How many of you are there, mister? Honest answer.", PAL.gloomGlow),
      ];

    if (c.day === 4)
      return [
        P("Eli", "npc_kid", "I had a dream there were lots of you. In glass jars. Sleeping. All wearing the same face."),
        P("Eli", "npc_kid", "It wasn't a scary dream. The ones in the jars were smiling. Even the old one at the back."),
        P("Eli", "npc_kid", "If you go away tonight, will you come back? — Not back back. The other way back. As somebody else who thinks he's you.", PAL.gloomGlow),
        P("Eli", "npc_kid", "Don't be sad, mister. Bye!"),
      ];

    return [P("Eli", "npc_kid", "Hi mister!")];
  },

  /* ------------------------------------------------------------------ *
   * THE CUSTODIAN — Day 5 only, gated on kostasReveal.                  *
   * Not a villain. Almost convincing. Seductive in his reasonableness.  *
   * ------------------------------------------------------------------ */
  epistatis: (c) => {
    if (!c.flags.kostasReveal)
      return [
        P("The Custodian", "portrait_epistatis", "You shouldn't be here yet, child. Go home. Helena is waiting. The coffee is going cold.", PAL.gloomGlow),
      ];

    return [
      P("The Custodian", "portrait_epistatis", "There you are. I was hoping it would be tonight. Come in. Mind the step.", PAL.gloomGlow),
      P("The Custodian", "portrait_epistatis", "You see them, then. One hundred and twenty-four. All of you. The first one — in the corner there — he was twenty-three. He had your handwriting. None of them past forty. We never let it go past forty. That was the kindness, in the original design."),
      P("The Custodian", "portrait_epistatis", "I know what you are about to say. So let me say it first, and badly, and you can correct me. — You are about to tell me that those bodies are you, and that I have killed one hundred and twenty-three of you. Yes?", PAL.gloomGlow),
      P("The Custodian", "portrait_epistatis", "Listen carefully, Alex, because this is the part nobody else can tell you. — You are not the man who came here. You are the man this hallway made by walking. You are still being made, every moment, by everything around you. If I had given you a different yesterday, you would be a different person tonight. But you would still be you. Do you understand what I mean by still?"),
      P("The Custodian", "portrait_epistatis", "Every photograph of every person you have ever loved is a portrait of someone who is gone. Every day. Even out there, in the world before us. We just — we made the loss tidy. We made it small. We made it stop hurting."),
      P("The Custodian", "portrait_epistatis", "You do not remember any pain. You do not remember anyone dead. You do not remember the day your mother grew old, or the day you understood she would die. You will never have to. That is not nothing, Alex. That is something whole communities have prayed for since people learned to pray.", PAL.heartHi),
      P("The Custodian", "portrait_epistatis", "I made your coffee strong this morning. You didn't notice. It doesn't matter. You liked it.", PAL.gloomGlow),
      P("The Custodian", "portrait_epistatis", "I am not a wicked man. I was once like you. I chose this. I have been kind to you for a hundred and twenty-four mornings. I taught Helena to whisper 'good morning' a certain way because the third of you smiled when she did. He is gone. She still whispers it. You still smile. Tell me where the cruelty is, exactly. Point at it."),
      P("The Custodian", "portrait_epistatis", "The version of you who climbed this hill yesterday — he did not get to see the answer. You do. Is that fair? — Is anything? Tell me an honest thing about fairness, and I will surrender, here, now.", PAL.gloomGlow),
      P(
        "The Custodian",
        "portrait_epistatis",
        "Two doors. I'll not stop you at either. — Light the candles in the great hall, and they wake. They grow old. They hurt. They bury one another. They live. Or take my hand, child, and tomorrow is Monday again, and Helena whispers good morning, and your mother makes toast, and everything is fine. — Either is a kindness. Choose.",
        PAL.heartHi,
        (cc) => (cc.flags.endingAvailable = true),
      ),
    ];
  },
};
