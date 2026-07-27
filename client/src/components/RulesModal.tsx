/**
 * The rules reference. Opens on top of whatever is on screen and changes
 * nothing on the server, so anyone can read it mid-round without holding
 * everyone else up.
 */

import { Modal } from './ui';
import { CowToken } from './CowArt';

export function RulesModal({
  open,
  onClose,
  targetCows,
}: {
  open: boolean;
  onClose: () => void;
  targetCows: number;
}) {
  return (
    <Modal open={open} onClose={onClose} title="How to play">
      <div className="space-y-5">
        <section>
          <h3 className="font-display text-xl">The whole idea</h3>
          <p>
            This is not a game about being clever or right. It's a game about
            being <strong>predictable</strong>. Everyone answers the same
            question at the same time, and you want to write whatever you think
            most of the table will write.
          </p>
        </section>

        <section>
          <h3 className="font-display text-xl">Each round</h3>
          <ol className="ml-5 list-decimal space-y-1">
            <li>A question is revealed to everybody.</li>
            <li>
              Everyone writes one answer privately — including the Question
              Wrangler, who plays like everyone else.
            </li>
            <li>Once the last answer is in, they're all revealed together.</li>
          </ol>
        </section>

        <section className="rounded-2xl border-2 border-ink-900 bg-cream-100 p-4">
          <h3 className="flex items-center gap-2 font-display text-xl">
            <CowToken className="h-7 w-7" /> Earning cows
          </h3>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              The answer given by the <strong>most</strong> people is the herd
              answer. Everyone who wrote it gets one cow.
            </li>
            <li>
              Spelling, capitals and plurals don't matter — "Dogs", "dog" and "a
              DOG" all count as the same answer.
            </li>
            <li>
              If <strong>two or more answers tie</strong> for most popular,
              nobody gets a cow at all. Being split down the middle is not
              thinking like the herd.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border-2 border-moo-600 bg-moo-200 p-4">
          <h3 className="flex items-center gap-2 font-display text-xl text-moo-700">
            <CowToken pink className="h-7 w-7" /> The Pink Cow
          </h3>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              If <strong>exactly one</strong> player gives an answer nobody else
              gave, they're the odd one out and they take the Pink Cow.
            </li>
            <li>
              If <strong>two or more</strong> players are odd ones out, nobody
              takes it — it stays exactly where it is.
            </li>
            <li>
              It sticks with you until someone else becomes the sole odd one out
              and takes it off you.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="font-display text-xl">Winning</h3>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              First to <strong>{targetCows} cows</strong> while{' '}
              <strong>not</strong> holding the Pink Cow wins.
            </li>
            <li>
              Reach {targetCows} while stuck with the Pink Cow and you keep
              playing — you have to shed it first.
            </li>
            <li>
              If several players hit the target cleanly in the same round, the
              target climbs by one until someone is out in front on their own.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="font-display text-xl">The Question Wrangler</h3>
          <p>
            Purely ceremonial: the Wrangler reads the question out and moves the
            game on to the next round. The badge rotates so everyone gets a turn,
            and the Wrangler still answers every round like everyone else.
          </p>
        </section>
      </div>
    </Modal>
  );
}
