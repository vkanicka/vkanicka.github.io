<script>
  export let wordle;
  const ALPHABET = "QWERTYUIOPASDFGHJKLZXCVBNM".split("");
  let letterCount = 0;
  let wordCount = 0;
  const guessBoard = [
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
  ];
  const add = (letter) => {
    guessBoard[wordCount][letterCount] = letter;
    letterCount++;
    if (letterCount % 5 === 0) {
      wordCount++;
      letterCount = 0;
    }
  };
</script>

<main>
  <h1>WORDLE</h1>
  <!-- <button type="text">Back</button> -->
  <div class="keyboard">
    {#each ALPHABET as letter}
      {#if guessBoard[0].indexOf(letter) >= 0 || guessBoard[1].indexOf(letter) >= 0 || guessBoard[2].indexOf(letter) >= 0 || guessBoard[3].indexOf(letter) >= 0 || guessBoard[4].indexOf(letter) >= 0}
        <button class="alphi black" on:click={() => add(letter)}
          >{letter}</button
        >
      {:else}
        <button class="alphi baseline" on:click={() => add(letter)}
          >{letter}</button
        >
      {/if}
    {/each}
  </div>
  <!-- <button type="submit">Submit</button> -->

  <div class="gridContainer">
    {#each guessBoard as guessRow, gr}
      <div class="guessRow" id={gr}>
        {#each guessRow as guessI, gi}
          {#if guessBoard[gr][gi] === wordle[gi]}
            <div class="guessI green" id={gi}>{guessBoard[gr][gi]}</div>
          {:else if guessBoard[gr][gi] !== "" && wordle.indexOf(guessBoard[gr][gi]) >= 0}
            <div class="guessI yellow" id={gi}>{guessBoard[gr][gi]}</div>
          {:else}
            <div class="guessI" id={gi}>{guessBoard[gr][gi]}</div>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</main>

<style>
  .keyboard {
    display: flex;
    margin: 4rem;
    flex-wrap: wrap;
    padding: 0rem 10rem;
    justify-content: center;
  }
  .alphi {
    width: 5.75rem;
    height: 5rem;
    border-radius: 1rem;
    margin: 0.5rem;
    font-size: 2rem;
    color: grey;
  }
  .alphi:hover {
    background: pink;
  }
  .gridContainer {
    margin: 4rem;
    padding: 2rem;
    border-radius: 2rem;
    background-color: lightgray;
    display: grid;
    grid-template-columns: repeat (4, 1fr);
    gap: 1rem;
    grid-auto-rows: minmax(4rem, auto);
  }
  .guessRow {
    background: thistle;
    display: flex;
    justify-content: space-around;
    width: 100%;
  }
  .guessI {
    background: gray;
    width: 5rem;
    font-size: 3rem;
  }
  main {
    background-color: grey;
    color: aquamarine;
    font-family: "Avenir Light";
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }
  h1 {
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 10;
  }
  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
  .green {
    background: lime;
    color: gray;
  }
  .yellow {
    background: yellow;
    color: gray;
  }
  .black {
    background-color: gray;
    color: lightgray;
  }
  .baseline {
    color: grey;
    background: aquamarine;
  }
</style>
