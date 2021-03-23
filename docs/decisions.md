### make one stage or multiple

- organizing in multiple stages might be nice if there will be multiple tabs/section. In general any split setup is easier to implement with multiple stages. Alaternative is to implement this functionality in Konva.

+ many operations is easier to do if we only have one stage. E.g. current cursor position. Otherwise all operations will have to store/pass current stage.

---

Decision: work with multiple stages. Use helper functions to make it useful.