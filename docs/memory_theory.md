# Ebbinghaus Forgetting Curve

The Ebbinghaus forgetting curve is a concept in psychology that describes the rate at which information is forgotten over time when there is no attempt to retain it. It was developed by Hermann Ebbinghaus in the late 19th century.

## Key Concepts

- **Exponential Forgetting**: The curve shows that forgetting is exponential. The most significant memory loss occurs within the first few hours or days after learning.
- **Rate of Forgetting**: Without any reinforcement or spaced repetition, you can lose up to 50% of new information within an hour, 70% within 24 hours, and 90% within a week.

## Application in Reciting Systems

The Ebbinghaus forgetting curve is a fundamental principle behind the design of reciting and spaced repetition systems. These systems are designed to combat the forgetting curve by strategically scheduling reviews of learned material.

- **Spaced Repetition**: Reciting systems use spaced repetition to schedule reviews at increasing intervals. The first review is scheduled soon after the initial learning, and subsequent reviews are spaced further and further apart.
- **Active Recall**: These systems prompt users to actively recall information from memory, which is more effective for memory retention than passive re-reading.
- **Resetting the Curve**: Each time a user successfully recalls a piece of information, the forgetting curve for that information is "reset" or flattened, meaning the rate of forgetting is reduced.
- **Personalized Intervals**: Many systems personalize the review schedule based on the user's performance. If a user struggles with a particular item, it will be shown more frequently. If they recall it easily, the interval for the next review will be longer.

By leveraging the principles of the Ebbinghaus forgetting curve, reciting systems can help users move information from their short-term memory to their long-term memory more effectively.

# Other Modern Reciting Methods

Besides the Ebbinghaus forgetting curve, other modern and proven methods for reciting include:

- **Active Recall**: This method involves actively retrieving information from your memory. Instead of passively rereading a text, you test yourself, which strengthens the neural pathways associated with that memory.

- **Spaced Repetition**: This technique involves reviewing material at increasing intervals over time. The "spacing effect" shows that we retain information better when learning is spread out.

- **Chunking**: Breaking down large amounts of information into smaller, more manageable chunks makes it easier to memorize.

- **Visualization and Association**: Creating vivid mental images or connecting new information to existing knowledge can significantly improve recall.

- **Extemporaneous Speaking**: This method involves speaking from a well-prepared outline or notes, rather than a fully memorized script. It allows for a more natural and engaging delivery.

- **Verbalization**: This involves practicing your recitation out loud multiple times. This helps to internalize the content and identify any awkward phrasing or areas that need refinement.

- **Auditory Learning**: Listening to recordings of the text can help with memorization and pronunciation.

# Active Recall and Spaced Repetition

## Active Recall

Active Recall, also known as retrieval practice, is the process of actively stimulating your memory for a piece of information. Instead of passively rereading or listening to material, you are actively trying to pull the information out of your brain. The effort of retrieving the information strengthens the neural pathways associated with that memory, making it easier to recall in the future.

Examples of active recall include:

- Answering questions about a topic without looking at your notes.
- Using flashcards and trying to remember the answer before flipping the card.
- Explaining a concept to someone else in your own words.

## Spaced Repetition

Spaced repetition is a learning technique that involves reviewing information at increasing intervals. It is a direct counter-strategy to the forgetting curve. Instead of cramming information all at once, you space out your review sessions.

Here’s how it works:

1. You learn something new.
2. You review it shortly after, just as you begin to forget it. This first review might be within a day.
3. The next review is scheduled for a slightly longer interval, perhaps a few days later.
4. With each successful recall, the interval before the next review gets progressively longer—from days to weeks to months.

## Comparison with Ebbinghaus Memory Curve

The three concepts are intrinsically linked:

- The **Ebbinghaus Forgetting Curve** identifies the problem: we naturally forget things over time.
- **Spaced Repetition** provides the scheduling solution: it dictates *when* you should review information to interrupt the forgetting curve most effectively.
- **Active Recall** is the *method* you use during those scheduled reviews. Instead of just rereading, you actively test yourself, which makes the memory stronger and more durable.

In essence, the most effective way to learn and retain information is to use **Active Recall** during review sessions that are timed according to the principles of **Spaced Repetition** to combat the natural decline of memory shown by the **Ebbinghaus Forgetting Curve**.

# Spaced Repetition Algorithm (SM-2)

One of the most well-known and influential spaced repetition algorithms is the SM-2 algorithm. It was created for SuperMemo in the late 1980s. The algorithm works by adjusting the "easiness factor" (EF) of a card based on how well you remember it during a review. This factor then determines the length of the next review interval.

## Core Concepts

- **`n` (Repetitions):** The number of times a card has been successfully recalled in a row.
- **`EF` (Easiness Factor):** A number representing how easy a card is to remember. It starts at 2.5. The minimum value is 1.3.
- **`I` (Interval):** The number of days to wait before reviewing the card again.
- **`q` (Quality):** A user's rating of how well they remembered the item, typically on a scale of 0 to 5.

## Quality of Response Scale (q)

The user provides a quality score after attempting to recall an item:

- **5:** Perfect response.
- **4:** Correct response after some hesitation.
- **3:** Correct response recalled with significant difficulty.
- **2:** Incorrect response, but the correct answer seemed familiar.
- **1:** Incorrect response.
- **0:** Complete blackout, no recollection.

## Algorithm Pseudo-code

This procedure is followed after each review of an item.

```
function sm2(q, n, ef, i)
  if q < 3 then
    n = 0
    i = 1
  else
    if n == 0 then
      i = 1
    else if n == 1 then
      i = 6
    else
      i = i * ef
    end if
    n = n + 1
  end if

  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if ef < 1.3 then
    ef = 1.3
  end if

  return (n, ef, i)
end function
```

## How it works

1.  **Get User's Quality of Response (`q`).**
    Retrieve the user's rating (`q`) for the item they just reviewed.

2.  **Check for failed recall.**
    If `q` is less than 3, the user has failed to recall the information. The repetition count (`n`) is reset to 0, and the interval (`I`) is set back to 1 day. The easiness factor (`EF`) remains unchanged.

3.  **If recall was successful (`q` is 3 or greater):**
    - **First Repetition:** If `n` is 0, the interval `I` is set to 1 day.
    - **Second Repetition:** If `n` is 1, the interval `I` is set to 6 days.
    - **Subsequent Repetitions (`n` > 1):** The next interval `I` is calculated by multiplying the previous interval by the easiness factor: `I = previous_I * EF`.
    - The repetition count `n` is incremented by 1.

4.  **Update the Easiness Factor (`EF`).**
    This step is performed *only if the recall was successful* (`q` >= 3).
    - The new `EF` is calculated using the formula: `EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))`
    - If the new `EF'` is less than 1.3, it is set to 1.3.
    - The item's `EF` is updated to the new `EF'`.

5.  **Save the new `n`, `I`, and `EF` values for the item.**
    The next review is scheduled for the date `today + I` days.