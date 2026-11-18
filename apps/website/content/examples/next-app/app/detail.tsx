export async function Detail() {
  // Illustrative server I/O; replace it with your application's data read.
  await new Promise((resolve) => setTimeout(resolve, 150));
  return <p id="server-detail">Deferred account detail from the server</p>;
}
