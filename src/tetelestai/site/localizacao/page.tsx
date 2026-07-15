import { InnerPage } from "../EventShell";

const mapUrl = "https://www.google.com/maps?q=Av.%20Ver.%20Jos%C3%A9%20Donato%2C%20913%2C%20Cabre%C3%BAva%2C%20SP%2C%2013318-000&output=embed";
const directionsUrl = "https://www.google.com/maps/dir/?api=1&destination=Av.+Ver.+Jos%C3%A9+Donato,+913,+Cabre%C3%BAva,+SP,+13318-000";

export default function Localizacao() {
  return <InnerPage eyebrow="Onde será" title="AD Jacaré">
    <section className="standalone-location">
      <div className="location-details">
        <span>Local do congresso</span>
        <h2>Esperamos você.</h2>
        <address>Av. Ver. José Donato, 913<br/>Cabreúva — SP<br/>CEP 13318-000</address>
        <a className="event-button dark" href={directionsUrl} target="_blank" rel="noreferrer">Traçar minha rota</a>
      </div>
      <div className="location-map">
        <iframe title="Mapa da AD Jacaré" src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      </div>
    </section>
  </InnerPage>;
}
