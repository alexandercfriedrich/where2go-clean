export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#10375C] to-[#313A4F] flex flex-col items-center justify-between">
      <header className="font-cormorant-garamond text-5xl md:text-6xl mt-12 mb-4 text-[#99BFF4] text-center font-bold">Where2Go</header>
      <main className="w-full flex flex-col items-center flex-1">
        <section
          className="w-full max-w-2xl rounded-xl relative flex flex-col items-center justify-center min-h-[45vh] m-8 shadow-2xl"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=900&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="pt-8 pb-4 text-2xl md:text-3xl text-[#FFE7A0] text-center font-cormorant-garamond tracking-widest font-semibold drop-shadow-lg">
            Entdecke die coolsten Events deiner Stadt<br />— weltweit und jederzeit.
          </div>
          <form className="bg-[#132743cc] m-4 px-8 py-6 rounded-3xl shadow-lg flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <input
              type="text"
              placeholder="Wohin möchtest du heute gehen?"
              className="rounded-xl border-none py-2 px-6 w-72 bg-[#222e44] text-[#FFE7A0] text-lg focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="bg-[#364164] text-[#FFE7A0] rounded-2xl px-8 py-3 font-bold text-base shadow-md hover:bg-[#465484] transition"
            >
              Jetzt suchen
            </button>
          </form>
        </section>
      </main>
      <footer className="text-base text-[#7d96c7] text-center py-12">
        Inspired by Gio Ponti, Retro Luxury &amp; mongibelloibiza.com &mdash; 2025
      </footer>
    </div>
  );
}
