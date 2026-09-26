export const TrafficLight = ({ luzVehicular, luzPeatonal }) => {
  return (
    <div className="traffic-light-container">
      {/* Semáforo Vehicular */}
      <div className="light-box">
        <h4>Vehicular</h4>
        <div className={`light-circle red ${luzVehicular === 'ROJO' ? 'active' : ''}`} />
        <div className={`light-circle yellow ${luzVehicular === 'AMARILLO' ? 'active' : ''}`} />
        <div className={`light-circle green ${luzVehicular === 'VERDE' ? 'active' : ''}`} />
      </div>

      {/* Semáforo Peatonal */}
      <div className="light-box">
        <h4>Peatonal</h4>
        <div className={`light-circle red ${luzPeatonal === 'ROJO' ? 'active' : ''}`} />
        <div className={`light-circle green ${luzPeatonal === 'VERDE' ? 'active' : ''}`} />
      </div>
    </div>
  );
};
