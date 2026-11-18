export async function Detail() {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return <p id="server-detail">Deferred account detail</p>;
}
