
//closure
// function createrCounter(){
//     let count=0;

//     return function inner(){
//         count++;
//         console.log(count);
//     }

// }
// const c = createrCounter();
// c();
// c();





//async and promise

// function delay () {
//     return new Promise ((resolve, reject )=>{
//         setTimeout(()=>{
//             resolve("done");

//         },1000);

//     });
// }

// async function run(){
//     const result = await delay();
//     console.log(result);

// }
// run();


// Event Loop (HIGHLY ASKED)
 
// console.log("start");

// setTimeout(() => console.log("timeout"), 0);

// Promise.resolve().then(() => console.log("promise"));

// console.log("end");

// start
// end
// promise
// timeout




// function outer() {
//     let x = 10;
//     return function inner() {
//       console.log(x);
//     };
//   }
//   const fn = outer();
//   fn();
// Why does it print 10?
// bcz when when outer function runs it store x=10 in context memory
// it didnt destroy it bcz its used in inner, so when outer is called it return inner
// so when fn(), it calls inner it remembers x=10, so prints 10





for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
  }
i didnt understand that , i was wrong in this, then i learned about it throught chatgpt,