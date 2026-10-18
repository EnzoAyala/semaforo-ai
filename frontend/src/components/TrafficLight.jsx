export const TrafficLight = ({ luzVehicular, luzPeatonal }) => {
  return (
    <div className="stage-lights" aria-label="Semáforos en vivo">
      <article className="pole pole-vehicular">
        <p className="pole-label">Vehicular</p>
        <div className="housing housing-3">
          <span
            className={`lens red ${luzVehicular === 'ROJO' ? 'on' : ''}`}
            aria-label="Rojo vehicular"
          />
          <span
            className={`lens yellow ${luzVehicular === 'AMARILLO' ? 'on' : ''}`}
            aria-label="Amarillo vehicular"
          />
          <span
            className={`lens green ${luzVehicular === 'VERDE' ? 'on' : ''}`}
            aria-label="Verde vehicular"
          />
        </div>
        <div className="pole-stem" />
      </article>

      <article className="pole pole-peatonal">
        <p className="pole-label">Peatonal</p>
        <div className="housing housing-2">
          <span
            className={`lens red ${luzPeatonal === 'ROJO' ? 'on' : ''}`}
            aria-label="Rojo peatonal"
          />
          <span
            className={`lens green ${luzPeatonal === 'VERDE' ? 'on' : ''}`}
            aria-label="Verde peatonal"
          />
        </div>
        <div className="pole-stem" />
      </article>
    </div>
  );
};
