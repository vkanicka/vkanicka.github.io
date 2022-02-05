<script>
  import { wordles } from "./wordles";
  const ALPHABET = "QWERTYUIOPASDFGHJKLZXCVBNM".split("");
  let letterCount = 0;
  let wordCount = 0;
  let guessBoard = [
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
  const reset = () => {
    letterCount = 0;
    wordCount = 0;
    guessBoard = [
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
    ];
    wordle = pickWordle();
  };
  let key;
  let keyCode;
  const rando = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  const pickWordle = () => {
    return wordles[rando(1, 500)].toUpperCase();
  };
  let wordle = pickWordle();

  const handleKeydown = (event) => {
    key = event.key.toUpperCase();
    keyCode = event.keyCode;
    if (key === "BACKSPACE") {
      undo();
    } else if (key === "ENTER") {
      reset();
    } else if (ALPHABET.indexOf(key) >= 0) {
      add(key);
    }
  };
  const undo = () => {
    console.log("back button clicked");
    console.log("word", wordCount);
    console.log("letter", letterCount);
    console.log(guessBoard[wordCount][letterCount - 1]);
    console.log(guessBoard);
    if (letterCount === 0) {
      letterCount = 4;
      wordCount--;
      console.log("letter now", letterCount);
    } else {
      letterCount--;
    }

    guessBoard[wordCount][letterCount] = "";
    console.log(guessBoard);
  };
</script>

<svelte:window on:keydown={handleKeydown} />

<main>
  <h1>WORDLE</h1>
  <div class="keyboard">
    {#each ALPHABET as letter}
      {#if guessBoard[0].indexOf(letter) >= 0 || guessBoard[1].indexOf(letter) >= 0 || guessBoard[2].indexOf(letter) >= 0 || guessBoard[3].indexOf(letter) >= 0 || guessBoard[4].indexOf(letter) >= 0}
        {#if wordle.includes(letter)}
          <button class="alphi aqua" on:click={() => add(letter)}
            >{letter}</button
          >
        {:else}
          <button class="alphi black" on:click={() => add(letter)}
            >{letter}</button
          >
        {/if}
      {:else}
        <button class="alphi baseline" on:click={() => add(letter)}
          >{letter}</button
        >
      {/if}
    {/each}
  </div>
  <button id="backButton" type="text" on:click={undo}>Back</button>
  <button id="resetButton" type="text" on:click={reset}>Reset</button>

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
    /* margin: 3rem; */
    flex-wrap: wrap;
    padding: 0rem 4rem;
    justify-content: center;
    max-width: 1000px;
    margin: 0 auto;
  }
  #backButton,
  #resetButton {
    border-radius: 0.5rem;
    margin: 0.5rem;
    font-size: 2rem;
    color: white;
    background: tomato;
    display: inline-block;
  }
  .alphi {
    width: 5rem;
    height: 4rem;
    border-radius: 0.5rem;
    margin: 0.5rem;
    font-size: 2rem;
    color: grey;
  }
  .alphi:hover {
    background: thistle;
  }
  .gridContainer {
    margin: 1rem;
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
  .aqua {
    color: grey;
    background: lime;
  }
  .baseline {
    color: grey;
    background: aquamarine;
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
