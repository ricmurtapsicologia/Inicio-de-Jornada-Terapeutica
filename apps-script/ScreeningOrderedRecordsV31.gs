/** Records de scoring pelo índice canônico da pergunta, não pelo título. */
function screeningScoringRecordsOrdered_(clinicalEntries,responses) {
  if(!Array.isArray(clinicalEntries)||!Array.isArray(responses)||clinicalEntries.length!==responses.length) throw new Error('SCORING_RECORD_COUNT_MISMATCH');
  return clinicalEntries.map(function(entry,i){
    const item=entry.item,type=entry.type,response=responses[i];
    let choices=[];
    try {
      if(type===FormApp.ItemType.MULTIPLE_CHOICE) choices=item.asMultipleChoiceItem().getChoices().map(function(c){return c.getValue();});
      else if(type===FormApp.ItemType.LIST) choices=item.asListItem().getChoices().map(function(c){return c.getValue();});
    } catch (_) {}
    const usable=choices.filter(function(c){return !/^selecione(?:\.\.\.)?$/i.test(String(c).trim());});
    return {
      title:String(entry.title||item.getTitle()||'').trim(),
      response:response,
      choiceIndex:usable.indexOf(String(response)),
      choices:usable,
      identity:false,
      order:i+1
    };
  });
}
