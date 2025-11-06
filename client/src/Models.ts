export interface PositionData {
    id: number;   
    latitude: number,
    longitude: number,
    isInsidePolygon: boolean,
    exitTime: string;
}

export type NewPositionData = Omit<PositionData, "id">;

export const SendDataToServer = async (body: NewPositionData) => {
    fetch('https://localhost:7152/api/positiondata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
        })
        .catch((error) => {
          console.error('Błąd podczas wywoływania endpointu API:', error);
        });
  };
