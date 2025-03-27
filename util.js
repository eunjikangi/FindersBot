const isSameDate = (date1, date2) => { 

  return date1.getFullYear() === date2.getFullYear() 

  && date1.getMonth() === date2.getMonth() 

  && date1.getDate() === date2.getDate(); 

} 
[출처] [JavaScript] 날짜/시간 비교, 3가지 방법|작성자 shph7706